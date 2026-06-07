import { Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UnitMeasure } from '../../../common/enums/unit-measure.enum';
import { ProductRecipeIngredient } from '../../menu/entities/product-recipe-ingredient.entity';
import { Producto } from '../../menu/entities/product.entity';
import { MovimientoStock } from './stock-movement.entity';

@Entity('ingredients')
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', unique: true, length: 120 })
  nombre: string;

  @Column({ name: 'unit_measure', type: 'enum', enum: UnitMeasure })
  unidadMedida: UnitMeasure;

  @Column({ name: 'current_stock', type: 'decimal', precision: 12, scale: 3, default: 0 })
  stockActual: string;

  @Column({ name: 'minimum_stock', type: 'decimal', precision: 12, scale: 3, default: 0 })
  stockMinimo: string;

  @Column({ name: 'active', default: true })
  activo: boolean;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imagenUrl: string | null;

  @ManyToMany(() => Producto, (producto) => producto.ingredientes)
  productos: Producto[];

  @OneToMany(() => ProductRecipeIngredient, (recipe) => recipe.ingrediente)
  recipeProducts: ProductRecipeIngredient[];

  @OneToMany(() => MovimientoStock, (movimiento) => movimiento.ingrediente)
  movimientos: MovimientoStock[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
