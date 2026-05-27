import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { FacturacionModule } from './billing/billing.module';
import { CocinaModule } from './kitchen/kitchen.module';
import { EmpresaModule } from './company/company.module';
import { envBoolean, envNumber, envString } from './config/env';
import { InventarioModule } from './inventory/inventory.module';
import { MenuModule } from './menu/menu.module';
import { MesasModule } from './tables/tables.module';
import { NotificacionesModule } from './notifications/notifications.module';
import { PedidosModule } from './orders/orders.module';
import { ReportModule } from './reports/report.module';
import { UsuariosModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: envString('DB_HOST', 'localhost'),
      port: envNumber('DB_PORT', 3306),
      username: envString('DB_USERNAME', 'root'),
      password: envString('DB_PASSWORD', ''),
      database: envString('DB_DATABASE', envString('DB_NAME', 'gusto_soft')),
      autoLoadEntities: true,
      synchronize: envBoolean('DB_SYNC', envBoolean('TYPEORM_SYNCHRONIZE', true)),
      logging: envBoolean('DB_LOGGING', false),
      timezone: 'Z',
    }),
    AuthModule,
    UsuariosModule,
    MesasModule,
    InventarioModule,
    MenuModule,
    PedidosModule,
    FacturacionModule,
    EmpresaModule,
    ReportModule,
    CocinaModule,
    NotificacionesModule,
  ],
})
export class AppModule {}
