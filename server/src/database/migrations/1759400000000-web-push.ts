import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebPush1759400000000 implements MigrationInterface {
  name = 'WebPush1759400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE push_subscriptions (
        id         serial PRIMARY KEY,
        user_id    int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint   text         NOT NULL UNIQUE,
        p256dh     varchar(200) NOT NULL,
        auth       varchar(100) NOT NULL,
        locale     varchar(5)   NOT NULL DEFAULT 'en',
        created_at timestamptz  NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_push_subscriptions_user_id" ON push_subscriptions (user_id)`);
    // Cuándo se notificó por push (null: pendiente). Se vuelve a null si cambia la hora
    await queryRunner.query(`ALTER TABLE reminders ADD COLUMN notified_at timestamptz`);
    await queryRunner.query(
      `CREATE INDEX "IDX_reminders_pending_push" ON reminders (remind_at) WHERE notified_at IS NULL AND NOT is_acknowledged`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_reminders_pending_push"`);
    await queryRunner.query(`ALTER TABLE reminders DROP COLUMN notified_at`);
    await queryRunner.query(`DROP TABLE push_subscriptions`);
  }
}
