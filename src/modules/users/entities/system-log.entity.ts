import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logs_sistema')
export class SystemLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  job: string;

  @Column({ name: 'affected_records', default: 0 })
  registrosAfectados: number;

  @Column({ name: 'executed_at', type: 'timestamp' })
  ejecutadoAt: Date;
}
