import { DataSourceOptions } from 'typeorm';
import { Goal } from '../goals/goal.entity.js';
import { Milestone } from '../goals/milestone.entity.js';
import { Reminder } from '../reminders/reminder.entity.js';
import { Task } from '../tasks/task.entity.js';
import { User } from '../users/user.entity.js';
import { PasswordResetToken } from '../auth/password-reset-token.entity.js';
import { InitialSchema1759200000000 } from './migrations/1759200000000-initial-schema.js';
import { PasswordReset1759300000000 } from './migrations/1759300000000-password-reset.js';

export const ENTITIES = [User, Task, Goal, Milestone, Reminder, PasswordResetToken];
export const MIGRATIONS = [InitialSchema1759200000000, PasswordReset1759300000000];

/**
 * Opciones de TypeORM. El esquema lo definen las migraciones (nunca `synchronize`), que se aplican
 * al arrancar la aplicación.
 */
export function typeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: true,
    synchronize: false
  };
}
