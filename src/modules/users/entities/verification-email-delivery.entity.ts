import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './user.entity';

export enum VerificationEmailStatus {
  ENVIADO = 'ENVIADO',
  ERROR = 'ERROR',
}

@Entity('envios_verificacion')
export class VerificationEmailDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  usuario: Usuario;

  @Column({ type: 'enum', enum: VerificationEmailStatus })
  estado: VerificationEmailStatus;

  @Column({ name: 'error_detail', type: 'text', nullable: true })
  detalleError: string | null;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt: Date;
}
