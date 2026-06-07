import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertEmpresaDto } from './dto/upsert-company.dto';
import { Empresa } from './entities/company.entity';

@Injectable()
export class EmpresaService {
  constructor(@InjectRepository(Empresa) private readonly empresaRepo: Repository<Empresa>) {}

  async findCurrent() {
    const empresa = await this.empresaRepo.findOne({ where: {}, order: { id: 'ASC' } });
    return empresa ? this.toResponse(empresa) : null;
  }

  async upsert(dto: UpsertEmpresaDto) {
    const current = await this.empresaRepo.findOne({ where: {}, order: { id: 'ASC' } });
    const empresa =
      current ??
      this.empresaRepo.create({
        nombre: dto.nombre,
      });

    empresa.nombre = dto.nombre;
    empresa.nit = dto.nit ?? null;
    empresa.email = dto.email ?? null;
    empresa.telefono = dto.telefono ?? null;
    empresa.direccion = dto.direccion ?? null;
    empresa.logoUrl = dto.logo_url ?? null;

    return this.toResponse(await this.empresaRepo.save(empresa));
  }

  private toResponse(empresa: Empresa) {
    return {
      id: empresa.id,
      nombre: empresa.nombre,
      nit: empresa.nit,
      email: empresa.email,
      telefono: empresa.telefono,
      direccion: empresa.direccion,
      logo_url: empresa.logoUrl,
      created_at: empresa.createdAt,
      updated_at: empresa.updatedAt,
    };
  }
}
