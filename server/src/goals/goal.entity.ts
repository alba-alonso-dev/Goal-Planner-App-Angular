import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation
} from 'typeorm';
import { User } from '../users/user.entity.js';
import { Milestone } from './milestone.entity.js';

@Entity('goals')
@Index(['userId'])
export class Goal {
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

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'is_achieved', type: 'boolean', default: false })
  isAchieved!: boolean;

  @OneToMany(() => Milestone, milestone => milestone.goal, { cascade: true })
  milestones!: Relation<Milestone>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
