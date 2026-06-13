import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from '../../../common/enums/role.enum';
import { Usuario } from './user.entity';

@Entity('auditoria_usuarios')
export class UserAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  usuario: Usuario;

  @Column({ name: 'admin_id' })
  adminId: number;

  @Column({ name: 'assigned_role', type: 'enum', enum: Rol })
  rolAsignado: Rol;

  @Column({ name: 'timestamp_utc', type: 'timestamp' })
  timestampUtc: Date;
}
