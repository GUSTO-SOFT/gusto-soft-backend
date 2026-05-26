import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventory/inventory.module';
import { ProductRecipeIngredient } from './entities/product-recipe-ingredient.entity';
import { Producto } from './entities/product.entity';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, ProductRecipeIngredient]), InventarioModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService, TypeOrmModule],
})
export class MenuModule {}
