import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auditoria_facturacion')
export class AuditoriaFacturacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cuenta_id' })
  cuentaId: number;

  @Column({ name: 'cajero_id' })
  cajeroId: number;

  @Column({ name: 'total_neto', type: 'decimal', precision: 12, scale: 2 })
  totalNeto: string;

  @Column({ name: 'descuento', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: string;

  @Column({ name: 'closed_at', type: 'timestamp' })
  closedAt: Date;
}
