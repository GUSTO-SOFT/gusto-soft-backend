import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { errorBody } from '../../common/utils/error-response';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { UpdateIngredienteDto } from './dto/update-ingredient.dto';
import { Ingrediente } from './entities/ingredient.entity';
import { IngredientImagesService } from './ingredient-images.service';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Ingrediente) private readonly ingredientesRepo: Repository<Ingrediente>,
    private readonly ingredientImagesService: IngredientImagesService,
  ) {}

  async findAll(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.ingredientesRepo.findAndCount({
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items.map((ingrediente) => this.toResponse(ingrediente)),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateIngredienteDto) {
    const duplicated = await this.ingredientesRepo.findOne({ where: { nombre: dto.nombre } });
    if (duplicated) {
      throw new UnprocessableEntityException(
        errorBody('INGREDIENTE_DUPLICADO', 'Ya existe un ingrediente con ese nombre'),
      );
    }

    const ingrediente = await this.ingredientesRepo.save(
      this.ingredientesRepo.create({
        nombre: dto.nombre,
        unidadMedida: dto.unidad_medida,
        stockActual: dto.stock_actual.toFixed(3),
        stockMinimo: dto.stock_minimo.toFixed(3),
        imagenUrl: dto.imagen_url ?? null,
        activo: true,
      }),
    );
    return this.toResponse(ingrediente);
  }

  createFromMultipart(body: Record<string, unknown>, filename: string | undefined) {
    const dto: CreateIngredienteDto = {
      nombre: String(body.nombre ?? ''),
      unidad_medida: body.unidad_medida as CreateIngredienteDto['unidad_medida'],
      stock_actual: Number(body.stock_actual),
      stock_minimo: Number(body.stock_minimo),
      imagen_url: filename ? this.ingredientImagesService.buildPublicUrl(filename) : undefined,
    };

    return this.create(dto);
  }

  async update(id: number, dto: UpdateIngredienteDto) {
    const ingrediente = await this.ingredientesRepo.findOne({ where: { id } });
    if (!ingrediente) {
      throw new NotFoundException(errorBody('INGREDIENTE_NO_ENCONTRADO', 'Ingrediente no encontrado'));
    }

    if (dto.nombre !== undefined && dto.nombre.trim() !== ingrediente.nombre) {
      const duplicated = await this.ingredientesRepo.findOne({ where: { nombre: dto.nombre.trim() } });
      if (duplicated && duplicated.id !== id) {
        throw new UnprocessableEntityException(
          errorBody('INGREDIENTE_DUPLICADO', 'Ya existe un ingrediente con ese nombre'),
        );
      }
      ingrediente.nombre = dto.nombre.trim();
    }

    if (dto.unidad_medida !== undefined) ingrediente.unidadMedida = dto.unidad_medida;
    if (dto.stock_actual !== undefined) ingrediente.stockActual = dto.stock_actual.toFixed(3);
    if (dto.stock_minimo !== undefined) ingrediente.stockMinimo = dto.stock_minimo.toFixed(3);
    if (dto.imagen_url !== undefined) ingrediente.imagenUrl = dto.imagen_url;
    if (dto.activo !== undefined) ingrediente.activo = dto.activo;

    return this.toResponse(await this.ingredientesRepo.save(ingrediente));
  }

  updateFromMultipart(id: number, body: Record<string, unknown>, filename: string | undefined) {
    const dto: UpdateIngredienteDto = {};

    if (body.nombre !== undefined) dto.nombre = String(body.nombre);
    if (body.unidad_medida !== undefined) dto.unidad_medida = body.unidad_medida as UpdateIngredienteDto['unidad_medida'];
    if (body.stock_actual !== undefined) dto.stock_actual = Number(body.stock_actual);
    if (body.stock_minimo !== undefined) dto.stock_minimo = Number(body.stock_minimo);
    if (body.activo !== undefined) dto.activo = String(body.activo) === 'true';
    if (filename) dto.imagen_url = this.ingredientImagesService.buildPublicUrl(filename);

    return this.update(id, dto);
  }

  async remove(id: number) {
    return this.update(id, { activo: false });
  }

  findByIds(ids: number[]) {
    if (!ids.length) {
      return Promise.resolve([]);
    }
    return this.ingredientesRepo.find({ where: { id: In(ids) } });
  }

  toResponse(ingrediente: Ingrediente) {
    return {
      id: ingrediente.id,
      nombre: ingrediente.nombre,
      unidad_medida: ingrediente.unidadMedida,
      stock_actual: Number(ingrediente.stockActual),
      stock_minimo: Number(ingrediente.stockMinimo),
      imagen_url: ingrediente.imagenUrl,
      activo: ingrediente.activo,
    };
  }
}
