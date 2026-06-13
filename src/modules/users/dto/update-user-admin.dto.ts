import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Rol } from '../../../common/enums/role.enum';
import { UsuarioEstado } from '../../../common/enums/user-status.enum';

export class UpdateUsuarioDto {
  @ApiProperty({ example: 'Laura Perez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiProperty({ example: 'laura@gustosoft.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiProperty({ enum: Rol, example: Rol.MESERO })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiProperty({ enum: UsuarioEstado, example: UsuarioEstado.ACTIVO })
  @IsOptional()
  @IsEnum(UsuarioEstado)
  estado?: UsuarioEstado;
}

export class UpdateUsuarioRolDto {
  @ApiProperty({ enum: Rol, example: Rol.CAJERO })
  @IsString()
  rol: Rol;
}

export class UpdateUsuarioEstadoDto {
  @ApiProperty({ enum: UsuarioEstado, example: UsuarioEstado.INACTIVO })
  @IsEnum(UsuarioEstado)
  estado: UsuarioEstado;
}
