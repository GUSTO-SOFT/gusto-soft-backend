import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FacturaEnvioEstado } from '../enums/billing.enum';
import { FacturaElectronica } from './invoice.entity';

@Entity('factura_envios')
export class FacturaEnvio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'factura_id' })
  facturaId: number;

  @ManyToOne(() => FacturaElectronica, (factura) => factura.envios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'factura_id' })
  factura: FacturaElectronica;

  @Column({ name: 'email_destino', length: 254 })
  emailDestino: string;

  @Column({ name: 'estado', type: 'enum', enum: FacturaEnvioEstado })
  estado: FacturaEnvioEstado;

  @Column({ name: 'detalle_error', type: 'text', nullable: true })
  detalleError: string | null;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
