import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { envBoolean, envNumber } from '../../config/env';
import { SystemLog } from './entities/system-log.entity';
import { Usuario } from './entities/user.entity';
import { VerificationCode } from './entities/verification-code.entity';

@Injectable()
export class UserCleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(UserCleanupService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(VerificationCode)
    private readonly codesRepo: Repository<VerificationCode>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(SystemLog)
    private readonly logsRepo: Repository<SystemLog>,
  ) {}

  async onApplicationBootstrap() {
    if (envBoolean('USER_CLEANUP_DISABLED', false)) {
      return;
    }

    await this.runCleanup();
    this.interval = setInterval(() => {
      void this.runCleanup();
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async runCleanup() {
    const now = new Date();
    const expiredCodes = await this.codesRepo.update(
      {
        usado: false,
        expiresAt: LessThanOrEqual(now),
      },
      { usado: true },
    );

    const retentionDays = envNumber('PENDING_USERS_RETENTION_DAYS', 7);
    const pendingLimit = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const expiredUsers = await this.usuariosRepo.update(
      {
        estado: UsuarioEstado.PENDIENTE_VERIFICACION,
        rolAsignadoAt: LessThanOrEqual(pendingLimit),
      },
      {
        estado: UsuarioEstado.EXPIRADO,
        rol: null,
        rolAsignadoAt: null,
      },
    );

    const affected = (expiredCodes.affected ?? 0) + (expiredUsers.affected ?? 0);
    await this.logsRepo.save(
      this.logsRepo.create({
        job: 'users_verification_cleanup',
        registrosAfectados: affected,
        ejecutadoAt: now,
      }),
    );

    this.logger.log(`users_verification_cleanup affected ${affected} records`);
  }
}
