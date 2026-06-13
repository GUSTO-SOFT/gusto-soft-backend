import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../../common/enums/role.enum';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { errorBody } from '../../common/utils/error-response';
import { envNumber } from '../../config/env';
import { CreateMeseroDto, CreateUsuarioDto } from './dto/create-user.dto';
import { QueryUsuariosDto } from './dto/query-users.dto';
import { RegisterUsuarioDto, VerifyUsuarioDto } from './dto/register-user.dto';
import { UpdateUsuarioDto } from './dto/update-user-admin.dto';
import { Usuario } from './entities/user.entity';
import { UserAudit } from './entities/user-audit.entity';
import { UserVerificationService } from './user-verification.service';

type CreateUsuario = Pick<Usuario, 'nombre' | 'email' | 'passwordHash' | 'rol'>;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(UserAudit) private readonly userAuditsRepo: Repository<UserAudit>,
    private readonly verificationService: UserVerificationService,
  ) {}

  findById(id: number) {
    return this.usuariosRepo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.usuariosRepo.findOne({ where: { email } });
  }

  create(data: CreateUsuario) {
    return this.usuariosRepo.save(this.usuariosRepo.create(data));
  }

  async register(dto: RegisterUsuarioDto) {
    const email = dto.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new BadRequestException(errorBody('EMAIL_INVALIDO', 'Formato de email invalido'));
    }

    if (!PASSWORD_REGEX.test(dto.password)) {
      throw new BadRequestException(
        errorBody(
          'PASSWORD_INVALIDA',
          'La password debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial',
        ),
      );
    }

    if (dto.password !== dto.password_confirmacion) {
      throw new BadRequestException(errorBody('PASSWORDS_NO_COINCIDEN', 'Las passwords no coinciden'));
    }

    const exists = await this.findByEmail(email);
    if (exists && exists.estado !== UsuarioEstado.EXPIRADO) {
      throw new ConflictException(errorBody('EMAIL_DUPLICADO', 'Email duplicado'));
    }

    const passwordHash = await bcrypt.hash(dto.password, Math.max(12, envNumber('BCRYPT_ROUNDS', 12)));
    const usuario = await this.usuariosRepo.save(
      this.usuariosRepo.create({
        ...(exists ?? {}),
        nombre: `${dto.nombre.trim()} ${dto.apellido.trim()}`.trim(),
        email,
        passwordHash,
        rol: null,
        rolAsignadoAt: null,
        verifiedAt: null,
        estado: UsuarioEstado.PENDIENTE_ASIGNACION_ROL,
      }),
    );

    return {
      usuario_id: usuario.id,
      email: usuario.email,
      estado: usuario.estado,
    };
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

  async updateByAdmin(id: number, dto: UpdateUsuarioDto) {
    const usuario = await this.findOrFail(id);

    if (dto.email !== undefined && dto.email !== usuario.email) {
      const exists = await this.findByEmail(dto.email);
      if (exists && exists.id !== id) {
        throw new ConflictException(errorBody('USUARIO_DUPLICADO', 'Ya existe un usuario con ese email'));
      }
      usuario.email = dto.email;
    }

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre;
    }
    if (dto.rol !== undefined) {
      usuario.rol = dto.rol;
    }
    if (dto.estado !== undefined) {
      usuario.estado = dto.estado;
    }

    return this.toPublic(await this.usuariosRepo.save(usuario));
  }

  async assignRol(id: number, rol: Rol, adminId: number) {
    if (!Object.values(Rol).includes(rol)) {
      throw new BadRequestException(errorBody('ROL_INVALIDO', 'Rol no permitido'));
    }

    const usuario = await this.findOrFail(id);
    if (usuario.estado !== UsuarioEstado.PENDIENTE_ASIGNACION_ROL) {
      throw new ConflictException(errorBody('ROL_YA_ASIGNADO', 'El rol ya fue asignado o el usuario no esta pendiente'));
    }

    const now = new Date();
    usuario.rol = rol;
    usuario.estado = UsuarioEstado.PENDIENTE_VERIFICACION;
    usuario.rolAsignadoAt = now;

    await this.usuariosRepo.manager.transaction(async (manager) => {
      await manager.save(Usuario, usuario);
      await manager.save(
        UserAudit,
        manager.create(UserAudit, {
          usuarioId: usuario.id,
          adminId,
          rolAsignado: rol,
          timestampUtc: now,
        }),
      );
    });

    await this.verificationService.createAndSendCode(usuario);

    return {
      usuario_id: usuario.id,
      rol,
      estado: UsuarioEstado.PENDIENTE_VERIFICACION,
      verificacion_enviada: true,
    };
  }

  async updateEstado(id: number, estado: UsuarioEstado) {
    return this.updateByAdmin(id, { estado });
  }

  async verify(id: number, dto: VerifyUsuarioDto) {
    const usuario = await this.findOrFail(id);
    return this.verificationService.verify(usuario, dto.codigo);
  }

  async resendVerification(id: number) {
    const usuario = await this.findOrFail(id);
    return this.verificationService.resend(usuario);
  }

  async verificationStatus(id: number) {
    await this.findOrFail(id);
    return this.verificationService.status(id);
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

  private async findOrFail(id: number) {
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new NotFoundException(errorBody('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado'));
    }
    return usuario;
  }

  toPublic(usuario: Usuario) {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado,
      verified_at: usuario.verifiedAt,
      role_assigned_at: usuario.rolAsignadoAt,
      created_at: usuario.createdAt,
      updated_at: usuario.updatedAt,
    };
  }
}
