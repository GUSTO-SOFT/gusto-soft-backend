import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { PedidoEstado } from '../../common/enums/order-status.enum';

export class QueryCocinaPedidosDto {
  @ApiPropertyOptional({ example: 'PENDIENTE,EN_PREPARACION' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsEnum(PedidoEstado, { each: true })
  estado?: PedidoEstado[];
}
