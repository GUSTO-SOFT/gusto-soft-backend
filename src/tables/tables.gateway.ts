import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: true, path: '/mesas/estado' })
export class MesasGateway {
  @WebSocketServer()
  server: Server;

  emitEstado(payload: unknown) {
    this.server?.emit('mesa.estado', payload);
  }
}
