import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PedidoEstado } from '../../../common/enums/order-status.enum';

export class UpdateEstadoPedidoDto {
  @ApiProperty({ enum: [PedidoEstado.EN_PREPARACION, PedidoEstado.LISTO] })
  @IsEnum(PedidoEstado)
  estado: PedidoEstado;
}
