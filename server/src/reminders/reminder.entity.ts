import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation
} from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity('reminders')
@Index(['userId'])
export class Reminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  /** Instante concreto (con zona). */
  @Column({ name: 'remind_at', type: 'timestamptz' })
  remindAt!: Date;

  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged!: boolean;

  /** Cuándo se envió la notificación push (null: pendiente). */
  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
