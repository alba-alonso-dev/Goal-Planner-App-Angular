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

/** Suscripción Web Push de un navegador. Un navegador (endpoint) pertenece a un solo usuario. */
@Entity('push_subscriptions')
@Index(['userId'])
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'text', unique: true })
  endpoint!: string;

  @Column({ type: 'varchar', length: 200 })
  p256dh!: string;

  @Column({ type: 'varchar', length: 100 })
  auth!: string;

  /** Idioma de la interfaz al suscribirse: el de los textos de la notificación. */
  @Column({ type: 'varchar', length: 5, default: 'en' })
  locale!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
