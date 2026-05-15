import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateIngredienteDto {
  @ApiProperty({ example: 'Tomate' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MaxLength(40)
  unidad_medida: string;
}
