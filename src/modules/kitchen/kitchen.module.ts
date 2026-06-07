import { Module } from '@nestjs/common';
import { PedidosModule } from '../orders/orders.module';
import { CocinaController } from './kitchen.controller';

@Module({
  imports: [PedidosModule],
  controllers: [CocinaController],
})
export class CocinaModule {}
