import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CategoriaProducto } from '../../common/enums/product-category.enum';
import { Ingrediente } from '../../inventory/entities/ingredient.entity';
import { PedidoDetalle } from '../../orders/entities/order-item.entity';

@Entity('products')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', unique: true, length: 160 })
  nombre: string;

  @Column({ name: 'category', type: 'enum', enum: CategoriaProducto })
  categoria: CategoriaProducto;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  precio: string;

  @Column({ name: 'preparation_time' })
  tiempoPreparacion: number;

  @Column({ name: 'active', default: true })
  activo: boolean;

  @ManyToMany(() => Ingrediente, (ingrediente) => ingrediente.productos, { eager: true })
  @JoinTable({
    name: 'product_ingredients',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'ingredient_id', referencedColumnName: 'id' },
  })
  ingredientes: Ingrediente[];

  @OneToMany(() => PedidoDetalle, (detalle) => detalle.producto)
  detalles: PedidoDetalle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
