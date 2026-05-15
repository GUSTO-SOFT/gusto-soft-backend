import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Rol } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Admin Demo' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'admin@gustosoft.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'REMOVED_SEED_PASSWORD' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Rol })
  @IsEnum(Rol)
  rol: Rol;
}
