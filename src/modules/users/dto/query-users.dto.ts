import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Rol } from '../../../common/enums/role.enum';
import { UsuarioEstado } from '../../../common/enums/user-status.enum';

export class QueryUsuariosDto {
  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiPropertyOptional({ enum: UsuarioEstado })
  @IsOptional()
  @IsEnum(UsuarioEstado)
  estado?: UsuarioEstado;
}
