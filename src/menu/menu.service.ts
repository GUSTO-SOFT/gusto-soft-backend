import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorBody } from '../common/utils/error-response';
import { InventarioService } from '../inventory/inventory.service';
import { CreateProductoDto } from './dto/create-product.dto';
import { QueryProductosDto } from './dto/query-products.dto';
import { UpdateProductoDto } from './dto/update-product.dto';
import { AuditoriaMenu } from './entities/menu-audit.entity';
import { ProductRecipeIngredient } from './entities/product-recipe-ingredient.entity';
import { Producto } from './entities/product.entity';
import { ProductImagesService } from './product-images.service';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,

    @InjectRepository(ProductRecipeIngredient)
    private readonly recipeRepo: Repository<ProductRecipeIngredient>,

    @InjectRepository(AuditoriaMenu)
    private readonly auditoriaRepo: Repository<AuditoriaMenu>,

    private readonly inventarioService: InventarioService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  async create(dto: CreateProductoDto, usuarioId: number) {
    const duplicated = await this.productosRepo.findOne({ where: { nombre: dto.nombre } });
    if (duplicated) {
      throw new UnprocessableEntityException(
        errorBody('PRODUCTO_DUPLICADO', 'Ya existe un producto con ese nombre'),
      );
    }

    const ingredientesDto = dto.ingredientes;
    const ingredienteIds = ingredientesDto.map((i) => i.ingrediente_id);
    const ingredientes = await this.inventarioService.findByIds(ingredienteIds);

    if (!ingredientes.length || ingredientes.length !== new Set(ingredienteIds).size) {
      throw new UnprocessableEntityException(
        errorBody('INGREDIENTES_INVALIDOS', 'Debes agregar al menos un ingrediente valido'),
      );
    }

    if (dto.precio <= 0) {
      throw new UnprocessableEntityException(
        errorBody('PRECIO_INVALIDO', 'El precio debe ser mayor a 0'),
      );
    }

    try {
      const producto = this.productosRepo.create({
        nombre: dto.nombre,
        categoria: dto.categoria,
        precio: dto.precio.toFixed(2),
        tiempoPreparacion: this.normalizePreparationMinutes(dto.tiempo_preparacion),
        imagenUrl: dto.imagen_url ?? null,
        activo: true,
        ingredientes,
        recipeIngredients: dto.ingredientes.map((recipe) =>
          this.recipeRepo.create({
            ingredienteId: recipe.ingrediente_id,
            cantidadIngrediente: recipe.cantidad.toFixed(3),
          }),
        ),
      });

      const saved = await this.productosRepo.save(producto);
      const savedWithRelations = await this.findById(saved.id);
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          usuarioId,
          accion: 'POST',
          campoModificado: 'producto',
          valorAnterior: null,
          valorNuevo: JSON.stringify(this.toResponse(savedWithRelations)),
          productoId: saved.id,
        }),
      );
      return this.toResponse(savedWithRelations);
    } catch (error) {
      throw new ConflictException(
        errorBody('PRODUCTO_NO_CREADO', 'No se pudo crear el producto', error),
      );
    }
  }

  async createFromMultipart(body: Record<string, unknown>, filename: string | undefined, usuarioId: number) {
    const dto = this.parseMultipartProducto(body);
    if (filename) {
      dto.imagen_url = this.productImagesService.buildPublicUrl(filename);
    }
    return this.create(dto, usuarioId);
  }

  // RF13: PUT /menu/productos/:id
  async update(id: number, dto: UpdateProductoDto, usuarioId: number) {
    const producto = await this.findById(id);
    const cambios: Array<{ campo: string; anterior: string; nuevo: string }> = [];

    if (dto.nombre !== undefined && dto.nombre !== producto.nombre) {
      const dup = await this.productosRepo.findOne({ where: { nombre: dto.nombre } });
      if (dup && dup.id !== id) {
        throw new UnprocessableEntityException(
          errorBody('PRODUCTO_DUPLICADO', 'Ya existe un producto con ese nombre'),
        );
      }
      cambios.push({ campo: 'nombre', anterior: producto.nombre, nuevo: dto.nombre });
      producto.nombre = dto.nombre;
    }

    if (dto.categoria !== undefined && dto.categoria !== producto.categoria) {
      cambios.push({ campo: 'categoria', anterior: producto.categoria, nuevo: dto.categoria });
      producto.categoria = dto.categoria;
    }

    if (dto.precio !== undefined && dto.precio.toFixed(2) !== producto.precio) {
      cambios.push({ campo: 'precio', anterior: producto.precio, nuevo: dto.precio.toFixed(2) });
      producto.precio = dto.precio.toFixed(2);
    }

    if (dto.tiempo_preparacion !== undefined) {
      const tiempoPreparacion = this.normalizePreparationMinutes(dto.tiempo_preparacion);
      if (tiempoPreparacion !== producto.tiempoPreparacion) {
        cambios.push({
          campo: 'tiempo_preparacion',
          anterior: String(producto.tiempoPreparacion),
          nuevo: String(tiempoPreparacion),
        });
        producto.tiempoPreparacion = tiempoPreparacion;
      }
    }

    if (dto.imagen_url !== undefined && dto.imagen_url !== producto.imagenUrl) {
      cambios.push({ campo: 'imagen_url', anterior: producto.imagenUrl ?? '', nuevo: dto.imagen_url });
      producto.imagenUrl = dto.imagen_url;
    }

    if (dto.activo !== undefined && dto.activo !== producto.activo) {
      cambios.push({ campo: 'activo', anterior: String(producto.activo), nuevo: String(dto.activo) });
      producto.activo = dto.activo;
    }

    if (dto.ingredientes !== undefined) {
      const ids = dto.ingredientes.map((i) => i.ingrediente_id);
      const ingredientes = await this.inventarioService.findByIds(ids);
      if (!ingredientes.length || ingredientes.length !== new Set(ids).size) {
        throw new UnprocessableEntityException(
          errorBody('INGREDIENTES_INVALIDOS', 'Ingredientes invalidos'),
        );
      }
      cambios.push({ campo: 'ingredientes', anterior: JSON.stringify(producto.ingredientes.map((i) => i.id)), nuevo: JSON.stringify(ids) });
      producto.ingredientes = ingredientes;
      await this.recipeRepo.delete({ productoId: id });
      producto.recipeIngredients = dto.ingredientes.map((recipe) =>
        this.recipeRepo.create({
          productoId: id,
          ingredienteId: recipe.ingrediente_id,
          cantidadIngrediente: recipe.cantidad.toFixed(3),
        }),
      );
    }

    const saved = await this.productosRepo.save(producto);

    // Registrar auditoría por cada campo modificado
    await Promise.all(
      cambios.map((c) =>
        this.auditoriaRepo.save(
          this.auditoriaRepo.create({
            usuarioId,
            accion: 'UPDATE',
            campoModificado: c.campo,
            valorAnterior: c.anterior,
            valorNuevo: c.nuevo,
            productoId: id,
          }),
        ),
      ),
    );

    return this.toResponse(saved);
  }

  // RF13: PATCH /menu/productos/:id/disponibilidad
  async toggleDisponibilidad(id: number, activo: boolean, usuarioId: number) {
    const producto = await this.findById(id);
    const anterior = producto.activo;
    producto.activo = activo;
    await this.productosRepo.save(producto);

    await this.auditoriaRepo.save(
      this.auditoriaRepo.create({
        usuarioId,
        accion: 'PATCH',
        campoModificado: 'activo',
        valorAnterior: String(anterior),
        valorNuevo: String(activo),
        productoId: id,
      }),
    );

    return this.toResponse(producto);
  }

  async updateImage(id: number, filename: string | undefined, usuarioId: number) {
    if (!filename) {
      throw new BadRequestException(errorBody('IMAGEN_REQUERIDA', 'Debes adjuntar una imagen'));
    }

    const producto = await this.findById(id);
    const anterior = producto.imagenUrl;
    producto.imagenUrl = this.productImagesService.buildPublicUrl(filename);
    const saved = await this.productosRepo.save(producto);
    const savedWithRelations = await this.findById(saved.id);

    await this.auditoriaRepo.save(
      this.auditoriaRepo.create({
        usuarioId,
        accion: 'PATCH',
        campoModificado: 'imagen_url',
        valorAnterior: anterior,
        valorNuevo: producto.imagenUrl,
        productoId: id,
      }),
    );

    return this.toResponse(savedWithRelations);
  }

  // RF17: GET /menu/productos/:id/bloqueo
  async getBloqueo(id: number) {
    const producto = await this.findById(id);
    if (producto.activo) {
      return { bloqueado: false, motivo: null, ingredientes_agotados: [] };
    }

    const ingredientesAgotados = (producto.ingredientes ?? [])
      .filter((ing) => Number(ing.stockActual) === 0)
      .map((ing) => ({ id: ing.id, nombre: ing.nombre }));

    return {
      bloqueado: true,
      motivo: 'Ingrediente agotado',
      ingredientes_agotados: ingredientesAgotados,
    };
  }

  // RF17: bloqueo/reactivación automática por ingrediente
  async bloquearPorIngrediente(ingredienteId: number) {
    const productos = await this.productosRepo
      .createQueryBuilder('p')
      .innerJoin('p.ingredientes', 'ing', 'ing.id = :ingredienteId', { ingredienteId })
      .getMany();

    for (const producto of productos) {
      producto.activo = false;
      await this.productosRepo.save(producto);
    }
  }

  async reactivarPorIngrediente(ingredienteId: number) {
    const productos = await this.productosRepo
      .createQueryBuilder('p')
      .innerJoin('p.ingredientes', 'ing', 'ing.id = :ingredienteId', { ingredienteId })
      .getMany();

    for (const producto of productos) {
      // Solo reactiva si todos sus ingredientes tienen stock > 0
      const productoConIngredientes = await this.findById(producto.id);
      const todosConStock = productoConIngredientes.ingredientes.every(
        (ing) => Number(ing.stockActual) > 0,
      );
      if (todosConStock) {
        producto.activo = true;
        await this.productosRepo.save(producto);
      }
    }
  }

  async findAll(query: QueryProductosDto) {
    const productos = await this.productosRepo.find({
      where: query.activo === undefined ? {} : { activo: query.activo },
      order: { nombre: 'ASC' },
      relations: ['ingredientes', 'recipeIngredients', 'recipeIngredients.ingrediente'],
    });
    return productos.map((p) => this.toResponse(p));
  }

  async findById(id: number) {
    const producto = await this.productosRepo.findOne({
      where: { id },
      relations: ['ingredientes', 'recipeIngredients', 'recipeIngredients.ingrediente'],
    });
    if (!producto) {
      throw new NotFoundException(errorBody('PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado'));
    }
    return producto;
  }

  async findActiveByIds(ids: number[]) {
    const productos = await Promise.all([...new Set(ids)].map((id) => this.findById(id)));
    return productos.filter((p) => p.activo);
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
      ingredientes: this.toIngredientsResponse(producto),
      created_at: producto.createdAt,
      updated_at: producto.updatedAt,
    };
  }

  private toIngredientsResponse(producto: Producto) {
    if (producto.recipeIngredients?.length) {
      return producto.recipeIngredients.map((recipe) => ({
        id: recipe.ingrediente?.id ?? recipe.ingredienteId,
        nombre: recipe.ingrediente?.nombre ?? '',
        unidad_medida: recipe.ingrediente?.unidadMedida,
        stock_actual: Number(recipe.ingrediente?.stockActual ?? 0),
        stock_minimo: Number(recipe.ingrediente?.stockMinimo ?? 0),
        cantidad: Number(recipe.cantidadIngrediente),
      }));
    }
    return (
      producto.ingredientes?.map((ingrediente) => ({
        id: ingrediente.id,
        nombre: ingrediente.nombre,
        unidad_medida: ingrediente.unidadMedida,
        stock_actual: Number(ingrediente.stockActual),
        stock_minimo: Number(ingrediente.stockMinimo),
        cantidad: 1,
      })) ?? []
    );
  }

  private normalizePreparationMinutes(value: number) {
    if (value > 180 && value % 60 === 0) {
      return value / 60;
    }
    return value;
  }

  private parseMultipartProducto(body: Record<string, unknown>): CreateProductoDto {
    let ingredientes: Array<Record<string, unknown>> = [];
    const ingredientesRaw = body.ingredientes;

    try {
      ingredientes =
        typeof ingredientesRaw === 'string'
          ? JSON.parse(ingredientesRaw)
          : Array.isArray(ingredientesRaw)
            ? (ingredientesRaw as Array<Record<string, unknown>>)
            : [];
    } catch {
      throw new BadRequestException(errorBody('INGREDIENTES_INVALIDOS', 'Ingredientes invalidos'));
    }

    if (!Array.isArray(ingredientes) || !ingredientes.length) {
      throw new BadRequestException(errorBody('INGREDIENTES_INVALIDOS', 'Ingredientes invalidos'));
    }

    return {
      nombre: String(body.nombre ?? ''),
      categoria: body.categoria as CreateProductoDto['categoria'],
      precio: Number(body.precio),
      tiempo_preparacion: Number(body.tiempo_preparacion),
      imagen_url: typeof body.imagen_url === 'string' ? body.imagen_url : undefined,
      ingredientes: ingredientes.map((item) => ({
        ingrediente_id: Number(item.ingrediente_id),
        cantidad: Number(item.cantidad),
      })),
    };
  }
}
