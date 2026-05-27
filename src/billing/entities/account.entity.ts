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

@Entity('cuentas')
export class Cuenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'mesa_id' })
  mesaId: number;

  @ManyToOne(() => Mesa)
  @JoinColumn({ name: 'mesa_id' })
  mesa: Mesa;

  @Column({ name: 'estado', type: 'enum', enum: CuentaEstado, default: CuentaEstado.ABIERTA })
  estado: CuentaEstado;

  @Column({ name: 'items', type: 'json' })
  items: Record<string, unknown>[];

  @Column({ name: 'impuestos', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: string;

  @Column({ name: 'total_bruto', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalBruto: string;

  @Column({ name: 'descuento', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: string;

  @Column({ name: 'descuento_tipo', type: 'enum', enum: DescuentoTipo, nullable: true })
  descuentoTipo: DescuentoTipo | null;

  @Column({ name: 'descuento_motivo', type: 'varchar', length: 255, nullable: true })
  descuentoMotivo: string | null;

  @Column({ name: 'descuento_usuario_id', type: 'int', nullable: true })
  descuentoUsuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'descuento_usuario_id' })
  descuentoUsuario: Usuario | null;

  @Column({ name: 'total_neto', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalNeto: string;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 40, nullable: true })
  metodoPago: string | null;

  @Column({ name: 'monto_recibido', type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoRecibido: string | null;

  @Column({ name: 'cambio', type: 'decimal', precision: 12, scale: 2, nullable: true })
  cambio: string | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'cajero_id', type: 'int', nullable: true })
  cajeroId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cajero_id' })
  cajero: Usuario | null;

  @OneToMany(() => FacturaElectronica, (factura) => factura.cuenta)
  facturas: FacturaElectronica[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
