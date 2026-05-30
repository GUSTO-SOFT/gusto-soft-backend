import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ingrediente } from './ingredient.entity';

@Entity('inventory_alerts')
export class AlertaInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ingredient_id' })
  ingredienteId: number;

  @ManyToOne(() => Ingrediente, { eager: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingrediente: Ingrediente;

  @Column({ name: 'active', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'generated_at' })
  generadaAt: Date;
}
