import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { errorBody } from '../../common/utils/error-response';
import { envBoolean, envNumber } from '../../config/env';
import { Usuario } from '../users/entities/user.entity';
import { UsuariosService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-recovery.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

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
