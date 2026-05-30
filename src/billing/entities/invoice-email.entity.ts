import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FacturaEnvioEstado } from '../enums/billing.enum';
import { FacturaElectronica } from './invoice.entity';

@Entity('invoice_emails')
export class FacturaEnvio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_id' })
  facturaId: number;

  @ManyToOne(() => FacturaElectronica, (factura) => factura.envios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  factura: FacturaElectronica;

  @Column({ name: 'destination_email', length: 254 })
  emailDestino: string;

  @Column({ name: 'status', type: 'enum', enum: FacturaEnvioEstado })
  estado: FacturaEnvioEstado;

  @Column({ name: 'error_detail', type: 'text', nullable: true })
  detalleError: string | null;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
