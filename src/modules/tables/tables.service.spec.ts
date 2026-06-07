import { ConflictException } from '@nestjs/common';
import { MesaEstado } from '../../common/enums/table-status.enum';
import { MesasService } from './tables.service';

describe('MesasService', () => {
  it('lanza MESA_YA_OCUPADA cuando se intenta abrir una mesa ocupada', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        numero: 1,
        estado: MesaEstado.OCUPADA,
        openedAt: new Date(),
        meseroId: null,
      }),
    };
    const service = new MesasService(repo as any, {} as any, { emitEstado: jest.fn() } as any);

    await expect(service.abrir(1)).rejects.toBeInstanceOf(ConflictException);
  });
});
