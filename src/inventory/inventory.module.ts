import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ingrediente } from './entities/ingredient.entity';
import { MovimientoStock } from './entities/stock-movement.entity';
import { InventarioController } from './inventory.controller';
import { InventarioService } from './inventory.service';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente, MovimientoStock])],
  controllers: [InventarioController],
  providers: [InventarioService, StockService],
  exports: [InventarioService, StockService, TypeOrmModule],
})
export class InventarioModule {}
