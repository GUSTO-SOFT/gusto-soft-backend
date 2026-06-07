import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../orders/entities/order.entity';
import { Mesa } from '../tables/entities/restaurant-table.entity';
import { MesasModule } from '../tables/tables.module';
import { Cuenta } from './entities/account.entity';
import { AuditoriaFacturacion } from './entities/billing-audit.entity';
import { FacturaEnvio } from './entities/invoice-email.entity';
import { FacturaElectronica } from './entities/invoice.entity';
import { CuentasController, CuentasMesaController, FacturasController } from './billing.controller';
import { FacturacionService } from './billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cuenta, AuditoriaFacturacion, FacturaElectronica, FacturaEnvio, Pedido, Mesa]),
    MesasModule,
  ],
  controllers: [CuentasMesaController, CuentasController, FacturasController],
  providers: [FacturacionService],
})
export class FacturacionModule {}
