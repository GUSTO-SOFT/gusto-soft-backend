import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CrearMesaDto {
  @ApiProperty({ example: 13 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero: number;
}
