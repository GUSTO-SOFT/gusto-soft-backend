import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorBody } from '../common/utils/error-response';
import { InventarioService } from '../inventory/inventory.service';
import { CreateProductoDto } from './dto/create-product.dto';
import { QueryProductosDto } from './dto/query-products.dto';
import { Producto } from './entities/product.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Producto) private readonly productosRepo: Repository<Producto>,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(dto: CreateProductoDto) {
    const duplicated = await this.productosRepo.findOne({ where: { nombre: dto.nombre } });
    if (duplicated) {
      throw new UnprocessableEntityException(errorBody('PRODUCTO_DUPLICADO', 'Ya existe un producto con ese nombre'));
    }

    const ingredientes = await this.inventarioService.findByIds(dto.ingredientes);
    if (!ingredientes.length || ingredientes.length !== new Set(dto.ingredientes).size) {
      throw new UnprocessableEntityException(
        errorBody('INGREDIENTES_INVALIDOS', 'Debes agregar al menos un ingrediente valido'),
      );
    }

    if (dto.precio <= 0) {
      throw new UnprocessableEntityException(errorBody('PRECIO_INVALIDO', 'El precio debe ser mayor a 0'));
    }

    try {
      const producto = this.productosRepo.create({
        nombre: dto.nombre,
        categoria: dto.categoria,
        precio: dto.precio.toFixed(2),
        tiempoPreparacion: dto.tiempo_preparacion,
        imagenUrl: dto.imagen_url ?? null,
        activo: true,
        ingredientes,
      });
      return this.toResponse(await this.productosRepo.save(producto));
    } catch (error) {
      throw new ConflictException(errorBody('PRODUCTO_NO_CREADO', 'No se pudo crear el producto', error));
    }
  }

  async findAll(query: QueryProductosDto) {
    const productos = await this.productosRepo.find({
      where: query.activo === undefined ? {} : { activo: query.activo },
      order: { nombre: 'ASC' },
    });
    return productos.map((producto) => this.toResponse(producto));
  }

  async findById(id: number) {
    const producto = await this.productosRepo.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException(errorBody('PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado'));
    }
    return producto;
  }

  async findActiveByIds(ids: number[]) {
    const productos = await Promise.all([...new Set(ids)].map((id) => this.findById(id)));
    return productos.filter((producto) => producto.activo);
  }

  toResponse(producto: Producto) {
    return {
      id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: Number(producto.precio),
      tiempo_preparacion: producto.tiempoPreparacion,
      imagen_url: producto.imagenUrl,
      activo: producto.activo,
      ingredientes: producto.ingredientes?.map((ingrediente) => ({
        id: ingrediente.id,
        nombre: ingrediente.nombre,
        unidad_medida: ingrediente.unidadMedida,
      })) ?? [],
      created_at: producto.createdAt,
      updated_at: producto.updatedAt,
    };
  }
}
