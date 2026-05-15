import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateIngredienteDto } from './dto/create-ingredient.dto';
import { Ingrediente } from './entities/ingredient.entity';

@Injectable()
export class InventarioService {
  constructor(@InjectRepository(Ingrediente) private readonly ingredientesRepo: Repository<Ingrediente>) {}

  findAll() {
    return this.ingredientesRepo.find({ order: { nombre: 'ASC' } });
  }

  create(dto: CreateIngredienteDto) {
    return this.ingredientesRepo.save(
      this.ingredientesRepo.create({
        nombre: dto.nombre,
        unidadMedida: dto.unidad_medida,
      }),
    );
  }

  findByIds(ids: number[]) {
    if (!ids.length) {
      return Promise.resolve([]);
    }
    return this.ingredientesRepo.find({ where: { id: In(ids) } });
  }
}
