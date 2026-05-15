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
    return this.notificacionesRepo.save(
      this.notificacionesRepo.create({
        pedidoId: pedido.id,
        tipo: NotificacionTipo.PEDIDO_LISTO,
        estado: deliveredToSocket ? NotificacionEstado.ENVIADA : NotificacionEstado.FALLIDA,
        dispositivoId: null,
        payload: {
          mesa_id: pedido.mesaId,
          mesa_numero: pedido.mesa?.numero,
          items_listos: pedido.detalles?.map((detalle) => ({
            producto_id: detalle.productoId,
            nombre: detalle.producto?.nombre,
            cantidad: detalle.cantidad,
          })) ?? [],
        },
      }),
    );
  }

  findByPedido(pedidoId: number) {
    return this.notificacionesRepo.find({
      where: { pedidoId },
      order: { enviadoAt: 'DESC' },
    });
  }
}
