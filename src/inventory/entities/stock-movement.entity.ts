import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StockMovementType } from '../../common/enums/stock-movement-type.enum';
import { Usuario } from '../../users/entities/user.entity';
import { Ingrediente } from './ingredient.entity';

@Entity('stock_movements')
export class MovimientoStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ingredient_id' })
  ingredienteId: number;

  @ManyToOne(() => Ingrediente, (ingrediente) => ingrediente.movimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredient_id' })
  ingrediente: Ingrediente;

  @Column({ type: 'enum', enum: StockMovementType })
  tipo: StockMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  cantidad: string;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({ name: 'user_id', nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  usuario: Usuario | null;

  @CreateDateColumn({ name: 'fecha_utc', type: 'timestamp' })
  fechaUtc: Date;
}
