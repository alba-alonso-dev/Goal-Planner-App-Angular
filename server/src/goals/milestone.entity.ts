import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Goal } from './goal.entity.js';

@Entity('milestones')
@Index(['goalId'])
export class Milestone {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'goal_id', type: 'int' })
  goalId!: number;

  @ManyToOne(() => Goal, goal => goal.milestones, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'goal_id' })
  goal?: Relation<Goal>;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ name: 'target_date', type: 'date' })
  targetDate!: string;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted!: boolean;

  /** Orden de presentación dentro del goal. */
  @Column({ type: 'int', default: 0 })
  position!: number;
}
