import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { UserVerificationService } from './user-verification.service';

describe('UserVerificationService', () => {
  it('reinicia intentos fallidos cuando ya salieron de la ventana de 15 minutos', async () => {
    const code = {
      id: 1,
      usuarioId: 25,
      codigoHash: createHash('sha256').update('123456').digest('hex'),
      usado: false,
      failedAttempts: 2,
      lastFailedAt: new Date(Date.now() - 16 * 60 * 1000),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    const codesRepo = {
      findOne: jest.fn().mockResolvedValue(code),
      save: jest.fn(async (entity) => entity),
    };
    const service = new UserVerificationService(codesRepo as any, {} as any);

    await expect(
      service.verify(
        {
          id: 25,
          estado: UsuarioEstado.PENDIENTE_VERIFICACION,
        } as any,
        '000000',
      ),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: expect.objectContaining({ code: 'CODIGO_INCORRECTO' }),
    });

    expect(codesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        failedAttempts: 1,
      }),
    );
  });
});
