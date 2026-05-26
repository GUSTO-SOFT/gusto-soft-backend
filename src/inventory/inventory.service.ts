import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { errorBody } from '../common/utils/error-response';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { Ingrediente } from './entities/ingredient.entity';

@Injectable()
export class InventarioService {
  constructor(@InjectRepository(Ingrediente) private readonly ingredientesRepo: Repository<Ingrediente>) {}

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
        activo: true,
      }),
    );
    return this.toResponse(ingrediente);
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
      activo: ingrediente.activo,
    };
  }
}
