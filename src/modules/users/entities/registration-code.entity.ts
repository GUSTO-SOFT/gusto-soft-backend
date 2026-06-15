import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './user.entity';

@Entity('codigos_registro')
export class RegistrationCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code_hash', length: 128 })
  codigoHash: string;

  @Column({ name: 'created_by_admin_id' })
  creadoPorAdminId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_admin_id' })
  creadoPorAdmin: Usuario;

  @Column({ name: 'used_by_user_id', nullable: true })
  usadoPorUsuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'used_by_user_id' })
  usadoPorUsuario: Usuario | null;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usadoAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;
}
