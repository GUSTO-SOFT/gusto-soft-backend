import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertEmpresaDto {
  @ApiProperty({ example: 'Gusto Soft Restaurante' })
  @IsString()
  @MaxLength(160)
  nombre: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  nit?: string;

  @ApiPropertyOptional({ example: 'contacto@gustosoft.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Calle 10 #5-20' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ example: 'https://cdn.gustosoft.local/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;
}
