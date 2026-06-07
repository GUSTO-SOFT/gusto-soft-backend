import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PedidoEstado } from '../../../common/enums/order-status.enum';
import { Pedido } from './order.entity';

@Entity('order_status_history')
export class PedidoEstadoHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  pedidoId: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.historialEstados, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  pedido: Pedido;

  @Column({ name: 'status', type: 'enum', enum: PedidoEstado })
  estado: PedidoEstado;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
