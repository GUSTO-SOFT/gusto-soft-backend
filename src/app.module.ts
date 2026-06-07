import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { FacturacionModule } from './modules/billing/billing.module';
import { EmpresaModule } from './modules/company/company.module';
import { InventarioModule } from './modules/inventory/inventory.module';
import { CocinaModule } from './modules/kitchen/kitchen.module';
import { MenuModule } from './modules/menu/menu.module';
import { NotificacionesModule } from './modules/notifications/notifications.module';
import { PedidosModule } from './modules/orders/orders.module';
import { ReportModule } from './modules/reports/report.module';
import { MesasModule } from './modules/tables/tables.module';
import { UsuariosModule } from './modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createTypeOrmOptions()),
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
