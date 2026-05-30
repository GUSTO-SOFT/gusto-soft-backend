import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventory/inventory.module';
import { AuditoriaMenu } from './entities/menu-audit.entity';
import { ProductRecipeIngredient } from './entities/product-recipe-ingredient.entity';
import { Producto } from './entities/product.entity';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, ProductRecipeIngredient, AuditoriaMenu]), InventarioModule],
  controllers: [ProductImagesController, MenuController],
  providers: [MenuService, ProductImagesService],
  exports: [MenuService, TypeOrmModule],
})
export class MenuModule {}
