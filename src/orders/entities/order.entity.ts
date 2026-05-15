import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PedidoEstado } from '../../common/enums/order-status.enum';
import { Mesa } from '../../tables/entities/restaurant-table.entity';
import { Notificacion } from '../../notifications/entities/notification.entity';
import { Usuario } from '../../users/entities/user.entity';
import { PedidoDetalle } from './order-item.entity';
import { PedidoEstadoHistorial } from './order-status-history.entity';

@Entity('orders')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'table_id' })
  mesaId: number;

  @ManyToOne(() => Mesa, (mesa) => mesa.pedidos, { eager: true })
  @JoinColumn({ name: 'table_id' })
  mesa: Mesa;

  @Column({ name: 'waiter_id' })
  meseroId: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.pedidos, { eager: true })
  @JoinColumn({ name: 'waiter_id' })
  mesero: Usuario;

  @Column({ name: 'status', type: 'enum', enum: PedidoEstado, default: PedidoEstado.BORRADOR })
  estado: PedidoEstado;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @OneToMany(() => PedidoDetalle, (detalle) => detalle.pedido, { cascade: true, eager: true })
  detalles: PedidoDetalle[];

  @OneToMany(() => PedidoEstadoHistorial, (historial) => historial.pedido, { cascade: true, eager: true })
  historialEstados: PedidoEstadoHistorial[];

  @OneToMany(() => Notificacion, (notificacion) => notificacion.pedido)
  notificaciones: Notificacion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
