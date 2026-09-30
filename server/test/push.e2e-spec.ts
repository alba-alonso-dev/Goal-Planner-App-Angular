import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PushService } from '../src/push/push.service.js';
import { createTestApp, pushResult, resetDatabase, sentPushes, signUp } from './test-app.js';

const subscription = (id: string, locale = 'en') => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
    auth: 'tBHItJI5svbpez7KI4CCXg'
  },
  locale
});

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

describe('Web Push (e2e)', () => {
  let app: INestApplication;
  let push: PushService;

  beforeAll(async () => {
    app = await createTestApp();
    push = app.get(PushService);
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDatabase(app);
    sentPushes.length = 0;
    pushResult.next = 'sent';
  });

  const count = async (sql: string) => Number((await app.get(DataSource).query(sql))[0].count);

  it('publishes the VAPID public key without a session', async () => {
    const res = await request(app.getHttpServer()).get('/api/push/config').expect(200);
    expect(res.body).toEqual({ publicKey: 'test-public-key' });
  });

  it('only accepts subscriptions from a session and to known push services', async () => {
    await request(app.getHttpServer()).post('/api/push/subscriptions').send(subscription('a')).expect(401);

    const { agent } = await signUp(app);
    await agent
      .post('/api/push/subscriptions')
      .send({ ...subscription('a'), endpoint: 'https://internal.example.com/admin' })
      .expect(400);
    await agent
      .post('/api/push/subscriptions')
      .send({ ...subscription('a'), endpoint: 'http://fcm.googleapis.com/fcm/send/a' })
      .expect(400);
    await agent.post('/api/push/subscriptions').send(subscription('a')).expect(204);
    expect(await count('SELECT count(*) FROM push_subscriptions')).toBe(1);
  });

  it('notifies each due reminder once, only to its owner, in the subscription language', async () => {
    const alice = await signUp(app);
    const bob = await signUp(app);
    await alice.agent.post('/api/push/subscriptions').send(subscription('alice', 'es')).expect(204);
    await bob.agent.post('/api/push/subscriptions').send(subscription('bob')).expect(204);

    const create = (agent: typeof alice.agent, title: string, at: string, extra = {}) =>
      agent
        .post('/api/reminders')
        .send({ title, reminderDateTime: at, ...extra })
        .expect(201);
    await create(alice.agent, 'Llamar', minutesFromNow(-1));
    await create(alice.agent, 'Futuro', minutesFromNow(30));
    await create(alice.agent, 'Muy antiguo', minutesFromNow(-120));
    await create(alice.agent, 'Ya hecho', minutesFromNow(-2), { isAcknowledged: true });

    expect(await push.sendDueReminders()).toBe(1);
    expect(sentPushes).toHaveLength(1);
    expect(sentPushes[0]!.target.endpoint).toContain('/alice');
    expect(sentPushes[0]!.payload).toMatchObject({
      title: '⏰ Llamar',
      body: 'Ha llegado la hora de este recordatorio.',
      url: 'reminders'
    });

    expect(await push.sendDueReminders()).toBe(0);
    expect(sentPushes).toHaveLength(1);
  });

  it('notifies again when the reminder time changes', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/push/subscriptions').send(subscription('a')).expect(204);
    const { body } = await agent
      .post('/api/reminders')
      .send({ title: 'Stand-up', description: 'Daily sync', reminderDateTime: minutesFromNow(-1) })
      .expect(201);
    await push.sendDueReminders();

    await agent
      .put(`/api/reminders/${body.reminderId}`)
      .send({ title: 'Stand-up', description: 'Daily sync', reminderDateTime: minutesFromNow(-0.5) })
      .expect(200);
    await push.sendDueReminders();

    expect(sentPushes.map(p => p.payload.body)).toEqual(['Daily sync', 'Daily sync']);
  });

  it('does not mark reminders of users without subscriptions', async () => {
    const { agent } = await signUp(app);
    await agent
      .post('/api/reminders')
      .send({ title: 'Check-in', reminderDateTime: minutesFromNow(-1) })
      .expect(201);
    expect(await push.sendDueReminders()).toBe(0);
    expect(await count('SELECT count(*) FROM reminders WHERE notified_at IS NULL')).toBe(1);
  });

  it('deletes subscriptions the push service no longer knows', async () => {
    const { agent } = await signUp(app);
    await agent.post('/api/push/subscriptions').send(subscription('a')).expect(204);
    await agent
      .post('/api/reminders')
      .send({ title: 'Check-in', reminderDateTime: minutesFromNow(-1) })
      .expect(201);
    pushResult.next = 'gone';

    await push.sendDueReminders();
    expect(await count('SELECT count(*) FROM push_subscriptions')).toBe(0);
  });

  it('moves a browser subscription to whoever subscribes last, and only the owner can remove it', async () => {
    const alice = await signUp(app);
    const bob = await signUp(app);
    await alice.agent.post('/api/push/subscriptions').send(subscription('shared')).expect(204);
    await bob.agent.post('/api/push/subscriptions').send(subscription('shared')).expect(204);

    const owner = await app.get(DataSource).query('SELECT user_id FROM push_subscriptions');
    expect(owner).toEqual([{ user_id: bob.userId }]);

    await alice.agent
      .delete('/api/push/subscriptions')
      .send({ endpoint: subscription('shared').endpoint })
      .expect(204);
    expect(await count('SELECT count(*) FROM push_subscriptions')).toBe(1);
    await bob.agent
      .delete('/api/push/subscriptions')
      .send({ endpoint: subscription('shared').endpoint })
      .expect(204);
    expect(await count('SELECT count(*) FROM push_subscriptions')).toBe(0);
  });
});
