import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Cuenta } from './account.entity';
import { FacturaEstado } from '../enums/billing.enum';
import { FacturaEnvio } from './invoice-email.entity';

@Entity('invoices')
export class FacturaElectronica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'account_id' })
  cuentaId: number;

  @ManyToOne(() => Cuenta, (cuenta) => cuenta.facturas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  cuenta: Cuenta;

  @Column({ name: 'document', type: 'json' })
  documento: Record<string, unknown>;

  @Column({ name: 'cufe', type: 'varchar', length: 160, nullable: true })
  cufe: string | null;

  @Column({ name: 'status', type: 'enum', enum: FacturaEstado })
  estado: FacturaEstado;

  @Column({ name: 'provider_response', type: 'json', nullable: true })
  respuestaProveedor: Record<string, unknown> | null;

  @Column({ name: 'error_body', type: 'text', nullable: true })
  errorBody: string | null;

  @Column({ name: 'attempts', default: 0 })
  intentos: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @CreateDateColumn({ name: 'timestamp_utc' })
  timestampUtc: Date;

  @OneToMany(() => FacturaEnvio, (envio) => envio.factura)
  envios: FacturaEnvio[];
}
