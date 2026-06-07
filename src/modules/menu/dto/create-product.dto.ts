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
  ValidateNested,
} from 'class-validator';

import { CategoriaProducto } from '../../../common/enums/product-category.enum';

export class ProductIngredientDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ingrediente_id: number;

  @ApiProperty({ example: 0.25 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  cantidad: number;
}

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

  @ApiPropertyOptional({
    example:
      'https://cdn.gustosoft.local/productos/hamburguesa-clasica.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imagen_url?: string;

  @ApiProperty({
    type: [ProductIngredientDto],
    example: [
      {
        ingrediente_id: 1,
        cantidad: 0.25,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductIngredientDto)
  ingredientes: ProductIngredientDto[];
}