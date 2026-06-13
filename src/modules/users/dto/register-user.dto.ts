import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RegisterUsuarioDto {
  @ApiProperty({ example: 'Ivan' })
  @IsString()
  @MaxLength(80)
  nombre: string;

  @ApiProperty({ example: 'Gomez' })
  @IsString()
  @MaxLength(80)
  apellido: string;

  @ApiProperty({ example: 'ivan@gmail.com' })
  @IsString()
  @MaxLength(160)
  email: string;

  @ApiProperty({ example: 'AdminGusto2026!#' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'AdminGusto2026!#' })
  @IsString()
  password_confirmacion: string;

}

export class VerifyUsuarioDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  codigo: string;
}
