import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('menu_audits')
export class AuditoriaMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  usuarioId: number;

  @Column({ name: 'action', length: 20 })
  accion: string;

  @Column({ name: 'changed_field', type: 'varchar', length: 100, nullable: true })
  campoModificado: string | null;

  @Column({ name: 'previous_value', type: 'text', nullable: true })
  valorAnterior: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  valorNuevo: string | null;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productoId: number | null;

  @CreateDateColumn({ name: 'timestamp_utc' })
  timestampUtc: Date;
}
