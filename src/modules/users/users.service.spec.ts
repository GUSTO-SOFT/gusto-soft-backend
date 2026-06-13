import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Rol } from '../../common/enums/role.enum';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { UsuariosService } from './users.service';

function createService() {
  const usuariosRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (entity) => ({ id: entity.id ?? 25, ...entity })),
    create: jest.fn((entity) => entity),
    find: jest.fn(),
    manager: {
      transaction: jest.fn(async (callback) =>
        callback({
          save: jest.fn(),
          create: jest.fn((entity) => entity),
        }),
      ),
    },
  };
  const userAuditsRepo = {};
  const verificationService = {
    createAndSendCode: jest.fn(),
  };

  const service = new UsuariosService(usuariosRepo as any, userAuditsRepo as any, verificationService as any);
  return { service, usuariosRepo, verificationService };
}

describe('UsuariosService - registro y verificacion', () => {
  it('registra usuario pendiente sin persistir password plano', async () => {
    const { service, usuariosRepo } = createService();
    usuariosRepo.findOne.mockResolvedValue(null);

    const response = await service.register({
      nombre: 'Ana',
      apellido: 'Ruiz',
      email: 'Ana.Ruiz@example.com',
      password: 'Password2026!',
      password_confirmacion: 'Password2026!',
    });

    expect(response).toEqual({
      usuario_id: 25,
      email: 'ana.ruiz@example.com',
      estado: UsuarioEstado.PENDIENTE_ASIGNACION_ROL,
    });

    const savedUser = usuariosRepo.create.mock.calls[0][0];
    expect(savedUser.passwordHash).not.toBe('Password2026!');
    expect(Number(savedUser.passwordHash.split('$')[2])).toBeGreaterThanOrEqual(12);
    await expect(bcrypt.compare('Password2026!', savedUser.passwordHash)).resolves.toBe(true);
    expect(savedUser.rol).toBeNull();
  });

  it('rechaza password confirmation distinto antes de consultar BD', async () => {
    const { service, usuariosRepo } = createService();

    await expect(
      service.register({
        nombre: 'Ana',
        apellido: 'Ruiz',
        email: 'ana@example.com',
        password: 'Password2026!',
        password_confirmacion: 'OtroPassword2026!',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PASSWORDS_NO_COINCIDEN' }),
    });
    expect(usuariosRepo.findOne).not.toHaveBeenCalled();
  });

  it('rechaza email invalido con codigo EMAIL_INVALIDO', async () => {
    const { service } = createService();

    await expect(
      service.register({
        nombre: 'Ana',
        apellido: 'Ruiz',
        email: 'correo-invalido',
        password: 'Password2026!',
        password_confirmacion: 'Password2026!',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: expect.objectContaining({ code: 'EMAIL_INVALIDO' }),
    });
  });

  it('rechaza email duplicado sin revelar datos de la cuenta existente', async () => {
    const { service, usuariosRepo } = createService();
    usuariosRepo.findOne.mockResolvedValue({ id: 9, estado: UsuarioEstado.ACTIVO });

    await expect(
      service.register({
        nombre: 'Ana',
        apellido: 'Ruiz',
        email: 'ana@example.com',
        password: 'Password2026!',
        password_confirmacion: 'Password2026!',
      }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({ code: 'EMAIL_DUPLICADO' }),
    });
  });

  it('asigna rol solo desde pendiente y dispara verificacion', async () => {
    const { service, usuariosRepo, verificationService } = createService();
    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 25,
      email: 'ana@example.com',
      nombre: 'Ana Ruiz',
      estado: UsuarioEstado.PENDIENTE_ASIGNACION_ROL,
      rol: null,
    } as any);

    const response = await service.assignRol(25, Rol.MESERO, 1);

    expect(response).toEqual({
      usuario_id: 25,
      rol: Rol.MESERO,
      estado: UsuarioEstado.PENDIENTE_VERIFICACION,
      verificacion_enviada: true,
    });
    expect(usuariosRepo.manager.transaction).toHaveBeenCalled();
    expect(verificationService.createAndSendCode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 25,
        rol: Rol.MESERO,
        estado: UsuarioEstado.PENDIENTE_VERIFICACION,
      }),
    );
  });
});
