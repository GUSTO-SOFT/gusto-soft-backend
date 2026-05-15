import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { envString } from '../config/env';
import { UsuariosService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envString('JWT_SECRET', 'change_me_super_secret'),
    });
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    const usuario = await this.usuariosService.findById(payload.sub);
    if (!usuario) {
      throw new UnauthorizedException('Token invalido');
    }

    return {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
  }
}
