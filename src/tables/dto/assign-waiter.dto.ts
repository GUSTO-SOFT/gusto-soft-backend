import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AsignarMeseroDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  mesero_id: number;
}
