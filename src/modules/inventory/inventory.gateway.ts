import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: true, path: '/inventario/eventos' })
export class InventarioEventosGateway {
  @WebSocketServer()
  server: Server;

  emitAlertaStockMinimo(payload: unknown) {
    this.server?.emit('alerta.stock_minimo', payload);
  }
}
