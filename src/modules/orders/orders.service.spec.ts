import { ConflictException } from '@nestjs/common';
import { PedidoEstado } from '../../common/enums/order-status.enum';
import { PedidosService } from './orders.service';

describe('PedidosService', () => {
  it('rechaza transiciones invalidas de estado', async () => {
    const service = new PedidosService(
      {} as any,
      {} as any,
      { create: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { emitPedidoEstado: jest.fn(), emitPedidoCreado: jest.fn() } as any,
      { emitPedidoListo: jest.fn() } as any,
    );
    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 1,
      estado: PedidoEstado.PENDIENTE,
      detalles: [],
      historialEstados: [],
    } as any);

    await expect(service.updateEstado(1, { estado: PedidoEstado.LISTO })).rejects.toBeInstanceOf(ConflictException);
  });
});
