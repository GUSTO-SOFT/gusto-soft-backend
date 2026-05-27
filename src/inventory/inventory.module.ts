import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { AlertaInventario } from './entities/inventory-alert.entity';
import { Ingrediente } from './entities/ingredient.entity';
import { MovimientoStock } from './entities/stock-movement.entity';
import { InventarioEventosGateway } from './inventory.gateway';
import { InventarioAlertasController, InventarioController } from './inventory.controller';
import { InventarioService } from './inventory.service';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente, MovimientoStock, AlertaInventario, Producto, ProductRecipeIngredient])],
  controllers: [InventarioController, InventarioAlertasController],
  providers: [InventarioService, StockService, InventarioEventosGateway],
  exports: [InventarioService, StockService, TypeOrmModule],
})
export class InventarioModule {}
