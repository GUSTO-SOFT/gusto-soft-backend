import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateIngredienteDto } from './create-ingredient.dto';

export class UpdateIngredienteDto extends PartialType(CreateIngredienteDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
