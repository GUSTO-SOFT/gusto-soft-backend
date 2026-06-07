import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: true, path: '/cocina/eventos' })
export class CocinaEventosGateway {
  @WebSocketServer()
  server: Server;

  emitPedidoCreado(payload: unknown) {
    this.server?.emit('pedido.creado', payload);
  }

  emitPedidoEstado(payload: unknown) {
    this.server?.emit('pedido.estado', payload);
  }
}

@Injectable()
@WebSocketGateway({ cors: true, path: '/notificaciones' })
export class NotificacionesGateway {
  @WebSocketServer()
  server: Server;

  emitPedidoListo(payload: unknown) {
    this.server?.emit('pedido.listo', payload);
  }

  emitPedidoEstado(payload: { evento?: string; mesero_id?: number; [key: string]: unknown }) {
    this.server?.emit('pedido.estado', payload);
    if (payload.evento) {
      this.server?.emit(payload.evento, payload);
    }
    if (payload.mesero_id) {
      this.server?.to(`mesero:${payload.mesero_id}`).emit('pedido.estado', payload);
    }
  }
}
