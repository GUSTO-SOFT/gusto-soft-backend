import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { Rol } from '../common/enums/role.enum';
import { UsuarioEstado } from '../common/enums/user-status.enum';
import { errorBody } from '../common/utils/error-response';
import { Empresa } from '../company/entities/company.entity';
import { envBoolean, envNumber } from '../config/env';
import { Usuario } from '../users/entities/user.entity';
import { UsuariosService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-recovery.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usuariosService.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException(errorBody('USUARIO_DUPLICADO', 'Ya existe un usuario con ese email'));
    }

    const rounds = envNumber('BCRYPT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const usuario = await this.usuariosService.create({ ...dto, passwordHash, rol: Rol.ADMIN });
    return this.loginWithUser(usuario);
  }

  async registerCompany(dto: RegisterCompanyDto) {
    const exists = await this.usuariosService.findByEmail(dto.admin_email);
    if (exists) {
      throw new ConflictException(errorBody('USUARIO_DUPLICADO', 'Ya existe un usuario con ese email'));
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const empresas = await manager.count(Empresa);
      if (empresas > 0) {
        throw new ConflictException(
          errorBody('EMPRESA_YA_REGISTRADA', 'La empresa ya fue registrada'),
        );
      }

      const empresa = await manager.save(
        manager.create(Empresa, {
          nombre: dto.nombre_establecimiento,
          nit: dto.nit,
          email: dto.empresa_email ?? dto.admin_email,
          telefono: dto.empresa_telefono ?? null,
          direccion: dto.empresa_direccion ?? null,
          logoUrl: null,
        }),
      );

      const passwordHash = await bcrypt.hash(dto.admin_password, envNumber('BCRYPT_ROUNDS', 10));
      const admin = await manager.save(
        manager.create(Usuario, {
          nombre: dto.admin_nombre,
          email: dto.admin_email,
          passwordHash,
          rol: Rol.ADMIN,
          estado: UsuarioEstado.ACTIVO,
        }),
      );

      return { empresa, admin };
    });

    return {
      ...this.loginWithUser(result.admin),
      empresa: {
        id: result.empresa.id,
        nombre: result.empresa.nombre,
        nit: result.empresa.nit,
        email: result.empresa.email,
        telefono: result.empresa.telefono,
        direccion: result.empresa.direccion,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const usuario = await this.usuariosService.findByEmail(dto.email);
    if (!usuario) {
      return {
        message: 'Si el correo existe, se enviaran instrucciones para recuperar la contraseña',
      };
    }

    const token = randomBytes(32).toString('hex');
    usuario.passwordResetTokenHash = this.hashResetToken(token);
    usuario.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.dataSource.getRepository(Usuario).save(usuario);

    const response: Record<string, unknown> = {
      message: 'Si el correo existe, se enviaran instrucciones para recuperar la contraseña',
      expires_in_minutes: 30,
    };

    if (envBoolean('PASSWORD_RESET_RETURN_TOKEN', false)) {
      response.reset_token = token;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token);
    const usuario = await this.dataSource.getRepository(Usuario).findOne({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !usuario ||
      !usuario.passwordResetExpiresAt ||
      usuario.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(errorBody('TOKEN_INVALIDO', 'Token invalido o expirado'));
    }

    usuario.passwordHash = await bcrypt.hash(dto.nueva_password, envNumber('BCRYPT_ROUNDS', 10));
    usuario.passwordResetTokenHash = null;
    usuario.passwordResetExpiresAt = null;
    await this.dataSource.getRepository(Usuario).save(usuario);

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.findByEmail(dto.email);
    const validPassword = usuario ? await bcrypt.compare(dto.password, usuario.passwordHash) : false;

    if (!usuario || !validPassword) {
      throw new UnauthorizedException(errorBody('CREDENCIALES_INVALIDAS', 'Email o password incorrectos'));
    }

    return this.loginWithUser(usuario);
  }

  private loginWithUser(usuario: { id: number; email: string; rol: string; nombre: string }) {
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'Bearer',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
