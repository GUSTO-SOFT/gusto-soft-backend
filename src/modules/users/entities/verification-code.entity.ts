import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './user.entity';

@Entity('codigos_verificacion')
export class VerificationCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  usuario: Usuario;

  @Column({ name: 'code_hash', length: 128 })
  codigoHash: string;

  @Column({ default: false })
  usado: boolean;

  @Column({ name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ name: 'last_failed_at', type: 'datetime', nullable: true })
  lastFailedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;
}
