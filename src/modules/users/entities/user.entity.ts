import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Mesa } from '../../tables/entities/restaurant-table.entity';
import { Pedido } from '../../orders/entities/order.entity';
import { Rol } from '../../../common/enums/role.enum';
import { UsuarioEstado } from '../../../common/enums/user-status.enum';

@Entity('users')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', length: 120 })
  nombre: string;

  @Column({ unique: true, length: 160 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'password_reset_token_hash', type: 'varchar', length: 128, nullable: true })
  passwordResetTokenHash: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date | null;

  @Column({ name: 'role', type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ name: 'status', type: 'enum', enum: UsuarioEstado, default: UsuarioEstado.ACTIVO })
  estado: UsuarioEstado;

  @OneToMany(() => Mesa, (mesa) => mesa.mesero)
  mesas: Mesa[];

  @OneToMany(() => Pedido, (pedido) => pedido.mesero)
  pedidos: Pedido[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
