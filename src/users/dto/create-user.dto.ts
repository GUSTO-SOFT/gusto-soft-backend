import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_COMPLEXITY_MESSAGE, PASSWORD_COMPLEXITY_REGEX } from '../../auth/dto/password-rules';
import { Rol } from '../../common/enums/role.enum';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Laura Perez' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'laura@gustosoft.local' })
  @IsEmail()
  @MaxLength(160)
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  password: string;

  @ApiProperty({ enum: Rol, example: Rol.MESERO })
  @IsEnum(Rol)
  rol: Rol;
}

export class CreateMeseroDto {
  @ApiProperty({ example: 'Laura Perez' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'laura@gustosoft.local' })
  @IsEmail()
  @MaxLength(160)
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  password: string;
}
