import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/user.entity';
import { RegistrationCode } from './entities/registration-code.entity';
import { SystemLog } from './entities/system-log.entity';
import { UserAudit } from './entities/user-audit.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { VerificationEmailDelivery } from './entities/verification-email-delivery.entity';
import { InitialAdminService } from './initial-admin.service';
import { UserCleanupService } from './user-cleanup.service';
import { UserVerificationService } from './user-verification.service';
import { UsuariosController } from './users.controller';
import { UsuariosService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, RegistrationCode, VerificationCode, VerificationEmailDelivery, UserAudit, SystemLog])],
  controllers: [UsuariosController],
  providers: [UsuariosService, InitialAdminService, UserVerificationService, UserCleanupService],
  exports: [UsuariosService, TypeOrmModule],
})
export class UsuariosModule {}
