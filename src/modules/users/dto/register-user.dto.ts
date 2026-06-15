import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  codigo_registro: string;
}

export class CreateRegistrationCodeDto {
  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  expires_in_minutes?: number;
}

export class VerifyUsuarioDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  codigo: string;
}
