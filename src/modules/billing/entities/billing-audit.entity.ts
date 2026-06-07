import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('billing_audits')
export class AuditoriaFacturacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'account_id' })
  cuentaId: number;

  @Column({ name: 'cashier_id' })
  cajeroId: number;

  @Column({ name: 'net_total', type: 'decimal', precision: 12, scale: 2 })
  totalNeto: string;

  @Column({ name: 'discount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: string;

  @Column({ name: 'closed_at', type: 'timestamp' })
  closedAt: Date;
}
