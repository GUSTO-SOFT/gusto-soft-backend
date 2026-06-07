import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', length: 160 })
  nombre: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 40, nullable: true })
  nit: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
