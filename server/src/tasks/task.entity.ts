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

export const TASK_FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;
export type TaskFrequency = (typeof TASK_FREQUENCIES)[number];

@Entity('tasks')
@Index(['userId'])
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 10 })
  frequency!: TaskFrequency;

  /** Día natural (YYYY-MM-DD), sin hora ni zona. */
  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
