import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { UnitMeasure } from '../../../common/enums/unit-measure.enum';

export class CreateIngredienteDto {
  @ApiProperty({ example: 'Tomate' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ enum: UnitMeasure, example: UnitMeasure.KG })
  @IsEnum(UnitMeasure)
  unidad_medida: UnitMeasure;

  @ApiProperty({ example: 25.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  stock_actual: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  stock_minimo: number;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imagen_url?: string;
}
