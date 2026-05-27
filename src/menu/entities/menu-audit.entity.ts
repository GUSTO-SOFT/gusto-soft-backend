import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('auditoria_menu')
export class AuditoriaMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ name: 'accion', length: 20 })
  accion: string;

  @Column({ name: 'campo_modificado', type: 'varchar', length: 100, nullable: true })
  campoModificado: string | null;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior: string | null;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo: string | null;

  @Column({ name: 'producto_id', type: 'int', nullable: true })
  productoId: number | null;

  @CreateDateColumn({ name: 'timestamp_utc' })
  timestampUtc: Date;
}
