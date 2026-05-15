import { SetMetadata } from '@nestjs/common';
import { Rol } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
