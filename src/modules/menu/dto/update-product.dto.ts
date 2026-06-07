import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductoDto } from './create-product.dto';

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateDisponibilidadDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  activo: boolean;
}
