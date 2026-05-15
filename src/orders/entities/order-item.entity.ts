import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../menu/entities/product.entity';
import { Pedido } from './order.entity';

@Entity('order_items')
export class PedidoDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  pedidoId: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  pedido: Pedido;

  @Column({ name: 'product_id' })
  productoId: number;

  @ManyToOne(() => Producto, (producto) => producto.detalles, { eager: true })
  @JoinColumn({ name: 'product_id' })
  producto: Producto;

  @Column({ name: 'quantity' })
  cantidad: number;

  @Column({ name: 'notes', type: 'varchar', length: 255, nullable: true })
  notas: string | null;
}
