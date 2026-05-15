import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums/role.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
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
