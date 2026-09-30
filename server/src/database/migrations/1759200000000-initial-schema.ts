import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1759200000000 implements MigrationInterface {
  name = 'InitialSchema1759200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id            serial PRIMARY KEY,
        email         varchar(254) NOT NULL UNIQUE,
        full_name     varchar(120) NOT NULL,
        mobile_no     varchar(30)  NOT NULL,
        password_hash varchar(255) NOT NULL,
        created_at    timestamptz  NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE TABLE tasks (
        id           serial PRIMARY KEY,
        user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name         varchar(200) NOT NULL,
        description  text         NOT NULL DEFAULT '',
        frequency    varchar(10)  NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
        start_date   date         NOT NULL,
        due_date     date         NOT NULL,
        is_completed boolean      NOT NULL DEFAULT false,
        created_at   timestamptz  NOT NULL DEFAULT now(),
        CHECK (due_date >= start_date)
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_user_id" ON tasks (user_id)`);

    await queryRunner.query(`
      CREATE TABLE goals (
        id          serial PRIMARY KEY,
        user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        varchar(200) NOT NULL,
        description text         NOT NULL DEFAULT '',
        start_date  date         NOT NULL,
        end_date    date         NOT NULL,
        is_achieved boolean      NOT NULL DEFAULT false,
        created_at  timestamptz  NOT NULL DEFAULT now(),
        CHECK (end_date >= start_date)
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_goals_user_id" ON goals (user_id)`);

    await queryRunner.query(`
      CREATE TABLE milestones (
        id           serial PRIMARY KEY,
        goal_id      int          NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        name         varchar(200) NOT NULL,
        description  text         NOT NULL DEFAULT '',
        target_date  date         NOT NULL,
        is_completed boolean      NOT NULL DEFAULT false,
        position     int          NOT NULL DEFAULT 0
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_milestones_goal_id" ON milestones (goal_id)`);

    await queryRunner.query(`
      CREATE TABLE reminders (
        id              serial PRIMARY KEY,
        user_id         int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title           varchar(200) NOT NULL,
        description     text         NOT NULL DEFAULT '',
        remind_at       timestamptz  NOT NULL,
        is_acknowledged boolean      NOT NULL DEFAULT false,
        created_at      timestamptz  NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_reminders_user_id" ON reminders (user_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reminders`);
    await queryRunner.query(`DROP TABLE milestones`);
    await queryRunner.query(`DROP TABLE goals`);
    await queryRunner.query(`DROP TABLE tasks`);
    await queryRunner.query(`DROP TABLE users`);
  }
}
