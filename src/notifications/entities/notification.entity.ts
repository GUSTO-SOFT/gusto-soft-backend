import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NotificacionEstado, NotificacionTipo } from '../../common/enums/notification.enum';
import { Pedido } from '../../orders/entities/order.entity';

@Entity('notifications')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  pedidoId: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.notificaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  pedido: Pedido;

  @Column({ name: 'type', type: 'enum', enum: NotificacionTipo })
  tipo: NotificacionTipo;

  @Column({ name: 'status', type: 'enum', enum: NotificacionEstado })
  estado: NotificacionEstado;

  @Column({ name: 'device_id', type: 'varchar', length: 120, nullable: true })
  dispositivoId: string | null;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'sent_at' })
  enviadoAt: Date;
}
