import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordReset1759300000000 implements MigrationInterface {
  name = 'PasswordReset1759300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Se incrementa al cambiar o restablecer la contraseña: invalida las sesiones abiertas
    await queryRunner.query(`ALTER TABLE users ADD COLUMN session_version int NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id         serial PRIMARY KEY,
        user_id    int         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash char(64)    NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at    timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_user_id" ON password_reset_tokens (user_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE password_reset_tokens`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN session_version`);
  }
}
