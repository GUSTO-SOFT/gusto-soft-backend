import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionEstado, NotificacionTipo } from '../common/enums/notification.enum';
import { Pedido } from '../orders/entities/order.entity';
import { Notificacion } from './entities/notification.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion) private readonly notificacionesRepo: Repository<Notificacion>,
  ) {}

  createPedidoListo(pedido: Pedido, deliveredToSocket: boolean) {
    return this.createPedidoEstado(pedido, NotificacionTipo.PEDIDO_LISTO, deliveredToSocket);
  }

  createPedidoEnPreparacion(pedido: Pedido, deliveredToSocket: boolean) {
    return this.createPedidoEstado(pedido, NotificacionTipo.PEDIDO_EN_PREPARACION, deliveredToSocket);
  }

  findByPedido(pedidoId: number) {
    return this.notificacionesRepo.find({
      where: { pedidoId },
      order: { enviadoAt: 'DESC' },
    });
  }

  private createPedidoEstado(pedido: Pedido, tipo: NotificacionTipo, deliveredToSocket: boolean) {
    return this.notificacionesRepo.save(
      this.notificacionesRepo.create({
        pedidoId: pedido.id,
        tipo,
        estado: deliveredToSocket ? NotificacionEstado.ENVIADA : NotificacionEstado.FALLIDA,
        dispositivoId: null,
        payload: {
          pedido_id: pedido.id,
          mesa_id: pedido.mesaId,
          mesa_numero: pedido.mesa?.numero,
          mesero_id: pedido.meseroId,
          estado_pedido: pedido.estado,
          items: pedido.detalles?.map((detalle) => ({
            producto_id: detalle.productoId,
            nombre: detalle.producto?.nombre,
            cantidad: detalle.cantidad,
          })) ?? [],
        },
      }),
    );
  }
}
