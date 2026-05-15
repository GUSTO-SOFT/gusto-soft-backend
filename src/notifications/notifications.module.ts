import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from './entities/notification.entity';
import { NotificacionesService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion])],
  providers: [NotificacionesService],
  exports: [NotificacionesService, TypeOrmModule],
})
export class NotificacionesModule {}
