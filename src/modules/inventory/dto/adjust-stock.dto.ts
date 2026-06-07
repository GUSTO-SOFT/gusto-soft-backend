import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: -2.5, description: 'Cantidad positiva o negativa a aplicar al stock actual' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @NotEquals(0)
  delta: number;

  @ApiProperty({ example: 'Merma por preparacion' })
  @IsString()
  @MaxLength(255)
  motivo: string;
}
