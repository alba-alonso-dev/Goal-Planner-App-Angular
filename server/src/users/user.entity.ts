import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Siempre en minúsculas; índice único. */
  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ name: 'mobile_no', type: 'varchar', length: 30 })
  mobileNo!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  /** Va en el JWT: al incrementarse, las sesiones emitidas antes dejan de ser válidas. */
  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
