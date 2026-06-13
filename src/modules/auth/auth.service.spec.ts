import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { AuthService } from './auth.service';

describe('AuthService - login de cuentas pendientes', () => {
  it('rechaza credenciales validas si la cuenta no esta activa', async () => {
    const passwordHash = await bcrypt.hash('Password2026!', 12);
    const usuariosService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 25,
        email: 'ana@example.com',
        nombre: 'Ana Ruiz',
        passwordHash,
        rol: null,
        estado: UsuarioEstado.PENDIENTE_VERIFICACION,
      }),
    };
    const service = new AuthService(usuariosService as any, { sign: jest.fn() } as any, {} as any);

    await expect(service.login({ email: 'ana@example.com', password: 'Password2026!' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: expect.objectContaining({ code: 'CUENTA_NO_ACTIVA' }),
    });
  });
});
