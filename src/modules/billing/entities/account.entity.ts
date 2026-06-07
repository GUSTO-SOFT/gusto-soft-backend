import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mesa } from '../../tables/entities/restaurant-table.entity';
import { Usuario } from '../../users/entities/user.entity';
import { CuentaEstado, DescuentoTipo } from '../enums/billing.enum';
import { FacturaElectronica } from './invoice.entity';

@Entity('accounts')
export class Cuenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'table_id' })
  mesaId: number;

  @ManyToOne(() => Mesa)
  @JoinColumn({ name: 'table_id' })
  mesa: Mesa;

  @Column({ name: 'status', type: 'enum', enum: CuentaEstado, default: CuentaEstado.ABIERTA })
  estado: CuentaEstado;

  @Column({ name: 'items', type: 'json' })
  items: Record<string, unknown>[];

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'taxes', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: string;

  @Column({ name: 'gross_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalBruto: string;

  @Column({ name: 'discount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: string;

  @Column({ name: 'discount_type', type: 'enum', enum: DescuentoTipo, nullable: true })
  descuentoTipo: DescuentoTipo | null;

  @Column({ name: 'discount_reason', type: 'varchar', length: 255, nullable: true })
  descuentoMotivo: string | null;

  @Column({ name: 'discount_user_id', type: 'int', nullable: true })
  descuentoUsuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'discount_user_id' })
  descuentoUsuario: Usuario | null;

  @Column({ name: 'net_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalNeto: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 40, nullable: true })
  metodoPago: string | null;

  @Column({ name: 'amount_received', type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoRecibido: string | null;

  @Column({ name: 'change_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cambio: string | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'cashier_id', type: 'int', nullable: true })
  cajeroId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cashier_id' })
  cajero: Usuario | null;

  @OneToMany(() => FacturaElectronica, (factura) => factura.cuenta)
  facturas: FacturaElectronica[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
