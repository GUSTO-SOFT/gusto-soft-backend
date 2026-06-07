import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CloseAccountDto {
  @ApiPropertyOptional({ example: 'EFECTIVO' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  metodo_pago?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_recibido?: number;
}
