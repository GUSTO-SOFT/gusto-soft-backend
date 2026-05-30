import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductRecipeIngredient } from '../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../menu/entities/product.entity';
import { AlertaInventario } from './entities/inventory-alert.entity';
import { Ingrediente } from './entities/ingredient.entity';
import { MovimientoStock } from './entities/stock-movement.entity';
import { IngredientImagesController } from './ingredient-images.controller';
import { IngredientImagesService } from './ingredient-images.service';
import { InventarioEventosGateway } from './inventory.gateway';
import { InventarioAlertasController, InventarioController } from './inventory.controller';
import { InventarioService } from './inventory.service';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente, MovimientoStock, AlertaInventario, Producto, ProductRecipeIngredient])],
  controllers: [IngredientImagesController, InventarioController, InventarioAlertasController],
  providers: [InventarioService, StockService, InventarioEventosGateway, IngredientImagesService],
  exports: [InventarioService, StockService, TypeOrmModule],
})
export class InventarioModule {}
