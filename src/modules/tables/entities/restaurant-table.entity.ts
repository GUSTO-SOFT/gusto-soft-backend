import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MesaEstado } from '../../../common/enums/table-status.enum';
import { Pedido } from '../../orders/entities/order.entity';
import { Usuario } from '../../users/entities/user.entity';

@Entity('restaurant_tables')
export class Mesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'number', unique: true })
  numero: number;

  @Column({ name: 'status', type: 'enum', enum: MesaEstado, default: MesaEstado.DISPONIBLE })
  estado: MesaEstado;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ name: 'waiter_id', type: 'int', nullable: true })
  meseroId: number | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.mesas, { nullable: true })
  @JoinColumn({ name: 'waiter_id' })
  mesero: Usuario | null;

  @OneToMany(() => Pedido, (pedido) => pedido.mesa)
  pedidos: Pedido[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
