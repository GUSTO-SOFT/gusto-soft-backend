import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_COMPLEXITY_MESSAGE, PASSWORD_COMPLEXITY_REGEX } from './password-rules';

export class RegisterCompanyDto {
  @ApiProperty({ example: 'Gusto Soft Restaurante' })
  @IsString()
  @MaxLength(160)
  nombre_establecimiento: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @MaxLength(40)
  nit: string;

  @ApiPropertyOptional({ example: 'contacto@gustosoft.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  empresa_email?: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  empresa_telefono?: string;

  @ApiPropertyOptional({ example: 'Calle 10 #5-20' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa_direccion?: string;

  @ApiProperty({ example: 'Admin Principal' })
  @IsString()
  @MaxLength(120)
  admin_nombre: string;

  @ApiProperty({ example: 'admin@gustosoft.local' })
  @IsEmail()
  @MaxLength(160)
  admin_email: string;

  @ApiProperty({ example: 'REMOVED_SEED_PASSWORD' })
  @IsString()
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  admin_password: string;
}
