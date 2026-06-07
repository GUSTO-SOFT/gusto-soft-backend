import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventory/inventory.module';
import { MenuModule } from '../menu/menu.module';
import { MesasModule } from '../tables/tables.module';
import { NotificacionesModule } from '../notifications/notifications.module';
import { PedidoDetalle } from './entities/order-item.entity';
import { PedidoEstadoHistorial } from './entities/order-status-history.entity';
import { Pedido } from './entities/order.entity';
import { CocinaEventosGateway, NotificacionesGateway } from './orders.gateway';
import { PedidosController } from './orders.controller';
import { PedidosService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, PedidoDetalle, PedidoEstadoHistorial]),
    InventarioModule,
    MesasModule,
    MenuModule,
    NotificacionesModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService, CocinaEventosGateway, NotificacionesGateway],
  exports: [PedidosService],
})
export class PedidosModule {}
