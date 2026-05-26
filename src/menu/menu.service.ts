import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { errorBody } from '../common/utils/error-response';
import { InventarioService } from '../inventory/inventory.service';
import { CreateProductoDto } from './dto/create-product.dto';
import { QueryProductosDto } from './dto/query-products.dto';
import { ProductRecipeIngredient } from './entities/product-recipe-ingredient.entity';
import { Producto } from './entities/product.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Producto) private readonly productosRepo: Repository<Producto>,
    @InjectRepository(ProductRecipeIngredient) private readonly recipeRepo: Repository<ProductRecipeIngredient>,
    private readonly dataSource: DataSource,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(dto: CreateProductoDto) {
    const duplicated = await this.productosRepo.findOne({ where: { nombre: dto.nombre } });
    if (duplicated) {
      throw new UnprocessableEntityException(errorBody('PRODUCTO_DUPLICADO', 'Ya existe un producto con ese nombre'));
    }

    const ingredientesDto = dto.ingredientes;
    const ingredienteIds = ingredientesDto.map((ingrediente) => ingrediente.ingrediente_id);
    const ingredientes = await this.inventarioService.findByIds(ingredienteIds);
    if (!ingredientes.length || ingredientes.length !== new Set(ingredienteIds).size) {
      throw new UnprocessableEntityException(
        errorBody('INGREDIENTES_INVALIDOS', 'Debes agregar al menos un ingrediente valido'),
      );
    }

    if (dto.precio <= 0) {
      throw new UnprocessableEntityException(errorBody('PRECIO_INVALIDO', 'El precio debe ser mayor a 0'));
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const producto = manager.create(Producto, {
          nombre: dto.nombre,
          categoria: dto.categoria,
          precio: dto.precio.toFixed(2),
          tiempoPreparacion: dto.tiempo_preparacion,
          activo: true,
          ingredientes,
        });
        const savedProduct = await manager.save(producto);
        await manager.save(
          ProductRecipeIngredient,
          ingredientesDto.map((ingredienteDto) =>
            manager.create(ProductRecipeIngredient, {
              productoId: savedProduct.id,
              ingredienteId: ingredienteDto.ingrediente_id,
              cantidadIngrediente: ingredienteDto.cantidad.toFixed(3),
            }),
          ),
        );
        return manager.findOneOrFail(Producto, { where: { id: savedProduct.id } });
      });
      return this.toResponse(saved);
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
      activo: producto.activo,
      ingredientes: this.toIngredientsResponse(producto),
      created_at: producto.createdAt,
      updated_at: producto.updatedAt,
    };
  }

  private toIngredientsResponse(producto: Producto) {
    if (producto.recipeIngredients?.length) {
      return producto.recipeIngredients.map((recipe) => ({
        id: recipe.ingrediente.id,
        nombre: recipe.ingrediente.nombre,
        unidad_medida: recipe.ingrediente.unidadMedida,
        cantidad: Number(recipe.cantidadIngrediente),
      }));
    }

    return (
      producto.ingredientes?.map((ingrediente) => ({
        id: ingrediente.id,
        nombre: ingrediente.nombre,
        unidad_medida: ingrediente.unidadMedida,
        cantidad: 1,
      })) ?? []
    );
  }
}
