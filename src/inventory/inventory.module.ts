import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ingrediente } from './entities/ingredient.entity';
import { InventarioController } from './inventory.controller';
import { InventarioService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ingrediente])],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService, TypeOrmModule],
})
export class InventarioModule {}
