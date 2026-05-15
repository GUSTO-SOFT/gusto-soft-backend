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
}
