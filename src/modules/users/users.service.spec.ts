import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Rol } from '../../common/enums/role.enum';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { RegistrationCode } from './entities/registration-code.entity';
import { Usuario } from './entities/user.entity';
import { UsuariosService } from './users.service';

const validRegisterDto = {
  nombre: 'Ana',
  apellido: 'Ruiz',
  email: 'Ana.Ruiz@example.com',
  password: 'Password2026!',
  password_confirmacion: 'Password2026!',
  codigo_registro: '123456',
};

function createService() {
  const transactionManager = {
    findOne: jest.fn().mockResolvedValue({
      id: 10,
      codigoHash: 'hash',
      usadoAt: null,
      usadoPorUsuarioId: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }),
    save: jest.fn(async (target, entity) => {
      if (target === Usuario) {
        return { id: entity.id ?? 25, ...entity };
      }
      return entity;
    }),
    create: jest.fn((_target, entity) => entity),
  };
  const usuariosRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (entity) => ({ id: entity.id ?? 25, ...entity })),
    create: jest.fn((entity) => entity),
    find: jest.fn(),
    manager: {
      transaction: jest.fn(async (callback) => callback(transactionManager)),
    },
  };
  const registrationCodesRepo = {
    create: jest.fn((entity) => entity),
    save: jest.fn(async (entity) => ({ id: 11, ...entity })),
  };
  const userAuditsRepo = {};
  const verificationService = {
    createAndSendCode: jest.fn(),
  };

  const service = new UsuariosService(
    usuariosRepo as any,
    registrationCodesRepo as any,
    userAuditsRepo as any,
    verificationService as any,
  );
  return { service, usuariosRepo, registrationCodesRepo, transactionManager, verificationService };
}

describe('UsuariosService - registro y verificacion', () => {
  it('crea codigo de registro para que el admin lo copie', async () => {
    const { service, registrationCodesRepo } = createService();

    const response = await service.createRegistrationCode(1, 15);

    expect(response.codigo).toMatch(/^\d{6}$/);
    expect(response.expires_in_minutes).toBe(15);
    expect(response.expires_at).toBeInstanceOf(Date);
    expect(registrationCodesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        creadoPorAdminId: 1,
        codigoHash: expect.not.stringMatching(response.codigo),
      }),
    );
  });

  it('registra usuario pendiente usando codigo de registro valido', async () => {
    const { service, usuariosRepo, transactionManager } = createService();
    usuariosRepo.findOne.mockResolvedValue(null);

    const response = await service.register(validRegisterDto);

    expect(response).toEqual({
      usuario_id: 25,
      email: 'ana.ruiz@example.com',
      estado: UsuarioEstado.PENDIENTE_ASIGNACION_ROL,
    });

    expect(transactionManager.findOne).toHaveBeenCalledWith(
      RegistrationCode,
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );

    const savedUser = transactionManager.create.mock.calls.find(([target]) => target === Usuario)?.[1];
    expect(savedUser.passwordHash).not.toBe('Password2026!');
    expect(Number(savedUser.passwordHash.split('$')[2])).toBeGreaterThanOrEqual(12);
    await expect(bcrypt.compare('Password2026!', savedUser.passwordHash)).resolves.toBe(true);
    expect(savedUser.rol).toBeNull();

    expect(transactionManager.save).toHaveBeenCalledWith(
      RegistrationCode,
      expect.objectContaining({
        usadoAt: expect.any(Date),
        usadoPorUsuarioId: 25,
      }),
    );
  });

  it('rechaza codigo de registro invalido', async () => {
    const { service, usuariosRepo, transactionManager } = createService();
    usuariosRepo.findOne.mockResolvedValue(null);
    transactionManager.findOne.mockResolvedValue(null);

    await expect(service.register(validRegisterDto)).rejects.toMatchObject({
      constructor: BadRequestException,
      response: expect.objectContaining({ code: 'CODIGO_REGISTRO_INVALIDO' }),
    });
  });

  it('rechaza password confirmation distinto antes de consultar BD', async () => {
    const { service, usuariosRepo } = createService();

    await expect(
      service.register({
        ...validRegisterDto,
        email: 'ana@example.com',
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
        ...validRegisterDto,
        email: 'correo-invalido',
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
        ...validRegisterDto,
        email: 'ana@example.com',
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
