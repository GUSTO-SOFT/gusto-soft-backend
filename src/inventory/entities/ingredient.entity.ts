import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Producto } from '../../menu/entities/product.entity';

@Entity('ingredients')
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', length: 120 })
  nombre: string;

  @Column({ name: 'unit_measure', length: 40 })
  unidadMedida: string;

  @ManyToMany(() => Producto, (producto) => producto.ingredientes)
  productos: Producto[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
