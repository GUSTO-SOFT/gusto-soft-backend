import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_parameters')
export class SystemParameter {
  @PrimaryColumn({ name: 'key', length: 120 })
  clave: string;

  @Column({ name: 'value', type: 'varchar', length: 255 })
  valor: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
