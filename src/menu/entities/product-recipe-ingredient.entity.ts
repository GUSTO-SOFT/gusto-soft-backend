import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Ingrediente } from '../../inventory/entities/ingredient.entity';
import { Producto } from './product.entity';

@Entity('product_recipe_ingredients')
@Unique(['productoId', 'ingredienteId'])
export class ProductRecipeIngredient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productoId: number;

  @ManyToOne(() => Producto, (producto) => producto.recipeIngredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  producto: Producto;

  @Column({ name: 'ingredient_id' })
  ingredienteId: number;

  @ManyToOne(() => Ingrediente, (ingrediente) => ingrediente.recipeProducts, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingrediente: Ingrediente;

  @Column({ name: 'ingredient_quantity', type: 'decimal', precision: 12, scale: 3, default: 1 })
  cantidadIngrediente: string;
}
