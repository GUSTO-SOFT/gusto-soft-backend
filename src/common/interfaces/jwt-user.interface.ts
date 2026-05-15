import { Rol } from '../enums/role.enum';

export interface JwtUser {
  sub: number;
  email: string;
  rol: Rol;
}
