import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { DescuentoTipo } from '../enums/billing.enum';

export class ApplyDiscountDto {
  @ApiProperty({ enum: DescuentoTipo })
  @IsEnum(DescuentoTipo)
  tipo: DescuentoTipo;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;

  @ApiProperty({ example: 'Cortesia autorizada por administracion' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}
