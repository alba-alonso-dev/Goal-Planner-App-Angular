import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, sentMails, signUp } from './test-app.js';

describe('Passwords (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDatabase(app);
    sentMails.length = 0;
  });

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ emailId: email, password });

  /** Otra sesión del mismo usuario (otro dispositivo). */
  const secondSession = async (email: string, password: string) => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ emailId: email, password }).expect(200);
    return agent;
  };

  /** Token del último email de recuperación enviado. */
  const lastResetToken = () => /[?&]token=([\w-]+)/.exec(sentMails.at(-1)!.text)![1]!;

  describe('change password', () => {
    it('requires a session', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({ currentPassword: 'x', newPassword: 'another-secret' })
        .expect(401);
    });

    it('rejects a wrong current password and a short new one', async () => {
      const { agent } = await signUp(app);
      const wrong = await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: 'not-my-password', newPassword: 'another-secret' })
        .expect(400);
      expect(wrong.body.message).toBe('Current password is incorrect');
      await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: 'supersecret', newPassword: 'short' })
        .expect(400);
    });

    it('changes the password, keeps this session and closes the others', async () => {
      const { agent, email, password } = await signUp(app);
      const otherDevice = await secondSession(email, password);

      await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: password, newPassword: 'brand-new-secret' })
        .expect(204);

      await agent.get('/api/auth/me').expect(200);
      await otherDevice.get('/api/auth/me').expect(401);
      await login(email, password).expect(401);
      await login(email, 'brand-new-secret').expect(200);
    });
  });

  describe('forgot / reset password', () => {
    it('answers the same for unknown emails and sends nothing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ emailId: 'nobody@example.com' })
        .expect(204);
      expect(sentMails).toHaveLength(0);
    });

    it('emails a single-use link that resets the password and closes every session', async () => {
      const { agent, email, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ emailId: email.toUpperCase(), locale: 'es' })
        .expect(204);
      expect(sentMails).toHaveLength(1);
      expect(sentMails[0]!.to).toBe(email);
      expect(sentMails[0]!.subject).toContain('Restablece');
      expect(sentMails[0]!.text).toContain('http://localhost:4200/reset-password?token=');

      const token = lastResetToken();
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'recovered-secret' })
        .expect(204);

      await agent.get('/api/auth/me').expect(401);
      await login(email, password).expect(401);
      await login(email, 'recovered-secret').expect(200);

      const reused = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'yet-another-secret' })
        .expect(400);
      expect(reused.body.message).toBe('This reset link is invalid or has expired');
    });

    it('only accepts the latest link, and not after it expires', async () => {
      const { email } = await signUp(app);
      const forgot = () =>
        request(app.getHttpServer()).post('/api/auth/forgot-password').send({ emailId: email }).expect(204);

      await forgot();
      const first = lastResetToken();
      await forgot();
      const second = lastResetToken();

      const reset = (token: string) =>
        request(app.getHttpServer()).post('/api/auth/reset-password').send({ token, newPassword: 'recovered-secret' });
      await reset(first).expect(400);

      await app.get(DataSource).query(`UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'`);
      await reset(second).expect(400);
    });

    it('rejects malformed tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'abc', newPassword: 'recovered-secret' })
        .expect(400);
    });
  });
});
