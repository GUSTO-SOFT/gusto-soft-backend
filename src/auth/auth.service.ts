import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { errorBody } from '../common/utils/error-response';
import { envNumber } from '../config/env';
import { UsuariosService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usuariosService.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException(errorBody('USUARIO_DUPLICADO', 'Ya existe un usuario con ese email'));
    }

    const rounds = envNumber('BCRYPT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const usuario = await this.usuariosService.create({ ...dto, passwordHash });
    return this.loginWithUser(usuario);
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
}
