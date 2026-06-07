import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ingrediente } from '../inventory/entities/ingredient.entity';
import { MovimientoStock } from '../inventory/entities/stock-movement.entity';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { PedidoDetalle } from '../orders/entities/order-item.entity';
import { Pedido } from '../orders/entities/order.entity';
import { SystemParameter } from './entities/system-parameter.entity';
import { ReportController } from './report.controller';
import { ReportExportService } from './report-export.service';
import { ReportService } from './report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      PedidoDetalle,
      Producto,
      ProductRecipeIngredient,
      Ingrediente,
      MovimientoStock,
      SystemParameter,
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportExportService],
})
export class ReportModule {}
