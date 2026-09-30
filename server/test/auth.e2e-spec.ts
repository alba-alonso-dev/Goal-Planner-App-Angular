import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase, signUp } from './test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('registers, returns the public profile and sets a hardened session cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ fullName: ' Ana ', emailId: ' ANA@Example.com ', password: 'supersecret', mobileNo: '600' })
      .expect(201);

    expect(response.body).toEqual({
      userId: expect.any(Number),
      emailId: 'ana@example.com',
      fullName: 'Ana',
      mobileNo: '600',
      createdDate: expect.any(String)
    });
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/gp_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('never returns the password hash', async () => {
    const { agent } = await signUp(app);
    const me = await agent.get('/api/auth/me').expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/password|scrypt/i);
  });

  it('rejects duplicated emails (case-insensitive) with 409', async () => {
    const { email } = await signUp(app);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ fullName: 'Otro', emailId: email.toUpperCase(), password: 'supersecret', mobileNo: '1' })
      .expect(409);
  });

  it('validates the registration body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ fullName: '', emailId: 'not-an-email', password: 'short', mobileNo: '' })
      .expect(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['emailId must be an email', 'password must be at least 8 characters long'])
    );
  });

  it('logs in with valid credentials and rejects invalid ones with the same message', async () => {
    const { email } = await signUp(app);
    const server = app.getHttpServer();

    await request(server).post('/api/auth/login').send({ emailId: email, password: 'supersecret' }).expect(200);
    const wrongPassword = await request(server).post('/api/auth/login').send({ emailId: email, password: 'nope-nope' });
    const unknownEmail = await request(server)
      .post('/api/auth/login')
      .send({ emailId: 'ghost@example.com', password: 'whatever' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('protects every resource by default and restores the session with /me', async () => {
    const server = app.getHttpServer();
    for (const path of ['/api/auth/me', '/api/tasks', '/api/goals', '/api/reminders']) {
      await request(server).get(path).expect(401);
    }
    const { agent, userId } = await signUp(app);
    expect((await agent.get('/api/auth/me').expect(200)).body.userId).toBe(userId);
  });

  it('rejects tampered or foreign tokens', async () => {
    await request(app.getHttpServer()).get('/api/tasks').set('Cookie', 'gp_session=not-a-jwt').expect(401);
    const forged = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.' + 'c2lnbmVkLXdpdGgtYW5vdGhlci1zZWNyZXQ';
    await request(app.getHttpServer()).get('/api/tasks').set('Cookie', `gp_session=${forged}`).expect(401);
  });

  it('logs out by clearing the cookie', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rate-limits login attempts', async () => {
    // App nueva: el contador del limitador es por instancia y los tests anteriores ya hicieron logins
    process.env['AUTH_RATE_LIMIT'] = '3';
    const fresh = await createTestApp();
    process.env['AUTH_RATE_LIMIT'] = '3';
    try {
      const attempt = () =>
        request(fresh.getHttpServer()).post('/api/auth/login').send({ emailId: 'a@b.com', password: 'wrong' });
      const statuses = [];
      for (let i = 0; i < 4; i++) statuses.push((await attempt()).status);
      expect(statuses).toEqual([401, 401, 401, 429]);
    } finally {
      process.env['AUTH_RATE_LIMIT'] = '1000';
      await fresh.close();
    }
  });

  it('exposes a public health check', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
  });
});
