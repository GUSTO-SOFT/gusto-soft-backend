import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoriaProducto } from '../../common/enums/product-category.enum';

export class CreateProductoDto {
  @ApiProperty({ example: 'Hamburguesa clasica' })
  @IsString()
  @MaxLength(160)
  nombre: string;

  @ApiProperty({ enum: CategoriaProducto })
  @IsEnum(CategoriaProducto)
  categoria: CategoriaProducto;

  @ApiProperty({ example: 28000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precio: number;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tiempo_preparacion: number;

  @ApiPropertyOptional({ example: 'https://cdn.gustosoft.local/productos/hamburguesa-clasica.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imagen_url?: string;

  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ingredientes: number[];
}
