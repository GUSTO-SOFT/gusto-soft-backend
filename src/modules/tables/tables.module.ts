import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from '../users/users.module';
import { Mesa } from './entities/restaurant-table.entity';
import { MesasController } from './tables.controller';
import { MesasGateway } from './tables.gateway';
import { MesasService } from './tables.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mesa]), UsuariosModule],
  controllers: [MesasController],
  providers: [MesasService, MesasGateway],
  exports: [MesasService, MesasGateway, TypeOrmModule],
})
export class MesasModule {}
