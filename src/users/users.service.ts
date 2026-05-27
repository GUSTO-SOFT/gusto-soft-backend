import { Injectable } from '@nestjs/common';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums/role.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
import { errorBody } from '../common/utils/error-response';
import { envNumber } from '../config/env';
import { CreateMeseroDto, CreateUsuarioDto } from './dto/create-user.dto';
import { QueryUsuariosDto } from './dto/query-users.dto';
import { Usuario } from './entities/user.entity';

type CreateUsuario = Pick<Usuario, 'nombre' | 'email' | 'passwordHash' | 'rol'>;

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>) {}

  findById(id: number) {
    return this.usuariosRepo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.usuariosRepo.findOne({ where: { email } });
  }

  create(data: CreateUsuario) {
    return this.usuariosRepo.save(this.usuariosRepo.create(data));
  }

  async createByAdmin(dto: CreateUsuarioDto) {
    if (![Rol.MESERO, Rol.CHEF, Rol.CAJERO, Rol.ADMIN].includes(dto.rol)) {
      throw new UnprocessableEntityException(errorBody('ROL_INVALIDO', 'Rol no permitido'));
    }
    return this.createWithPassword(dto);
  }

  async createMeseros(dtos: CreateMeseroDto[]) {
    const usuarios: ReturnType<typeof this.toPublic>[] = [];
    for (const dto of dtos) {
      usuarios.push(await this.createWithPassword({ ...dto, rol: Rol.MESERO }));
    }
    return usuarios;
  }

  async findAll(query: QueryUsuariosDto) {
    const where = {
      ...(query.rol ? { rol: query.rol } : {}),
      ...(query.estado ? { estado: query.estado } : {}),
    };
    const usuarios = await this.usuariosRepo.find({ where, order: { nombre: 'ASC' } });
    return usuarios.map((usuario) => this.toPublic(usuario));
  }

  async findEligibleMeseros() {
    return this.findAll({ rol: Rol.MESERO, estado: UsuarioEstado.ACTIVO });
  }

  private async createWithPassword(dto: CreateUsuarioDto) {
    const exists = await this.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException(errorBody('USUARIO_DUPLICADO', 'Ya existe un usuario con ese email'));
    }

    const passwordHash = await bcrypt.hash(dto.password, envNumber('BCRYPT_ROUNDS', 10));
    const usuario = await this.create({
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
    });
    return this.toPublic(usuario);
  }

  toPublic(usuario: Usuario) {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado,
      created_at: usuario.createdAt,
      updated_at: usuario.updatedAt,
    };
  }
}
