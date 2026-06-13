import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/user.entity';
import { InitialAdminService } from './initial-admin.service';
import { UsuariosController } from './users.controller';
import { UsuariosService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsuariosController],
  providers: [UsuariosService, InitialAdminService],
  exports: [UsuariosService, TypeOrmModule],
})
export class UsuariosModule {}
