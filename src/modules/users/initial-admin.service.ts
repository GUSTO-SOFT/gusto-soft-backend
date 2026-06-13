import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Rol } from '../../common/enums/role.enum';
import { UsuarioEstado } from '../../common/enums/user-status.enum';
import { envNumber } from '../../config/env';
import { Usuario } from './entities/user.entity';

@Injectable()
export class InitialAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialAdminService.name);

  constructor(@InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>) {}

  async onApplicationBootstrap() {
  this.logger.log('InitialAdminService ejecutándose...');

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const nombre = process.env.INITIAL_ADMIN_NAME?.trim() || 'Admin Principal';

  if (!email || !password) {
    return;
  }

    const exists = await this.usuariosRepo.findOne({ where: { email } });
    if (exists) {
      this.logger.log(`Initial admin already exists: ${email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, envNumber('BCRYPT_ROUNDS', 10));
    const now = new Date();
    await this.usuariosRepo.save(
      this.usuariosRepo.create({
        nombre,
        email,
        passwordHash,
        rol: Rol.ADMIN,
        estado: UsuarioEstado.ACTIVO,
        rolAsignadoAt: now,
        verifiedAt: now,
      }),
    );

    this.logger.log(`Initial admin created: ${email}`);
  }
}
