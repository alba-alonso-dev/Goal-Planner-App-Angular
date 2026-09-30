import { INestApplication } from '@nestjs/common';
import { createTestApp, resetDatabase, signUp } from './test-app.js';

type Agent = Awaited<ReturnType<typeof signUp>>['agent'];

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let alice: Agent;
  let bob: Agent;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    alice = (await signUp(app)).agent;
    bob = (await signUp(app)).agent;
  });
  afterAll(() => app.close());

  const task = {
    taskName: 'Leer',
    description: 'docs',
    frequency: 'Daily',
    startDate: '2026-06-01',
    dueDate: '2026-06-10'
  };

  describe('tasks', () => {
    it('supports the full CRUD cycle with date-only fields', async () => {
      const created = (await alice.post('/api/tasks').send(task).expect(201)).body;
      expect(created).toMatchObject({ ...task, isCompleted: false, taskId: expect.any(Number) });

      const updated = (
        await alice
          .put(`/api/tasks/${created.taskId}`)
          .send({ ...task, taskName: 'Leer más', isCompleted: true })
          .expect(200)
      ).body;
      expect(updated).toMatchObject({ taskName: 'Leer más', isCompleted: true, dueDate: '2026-06-10' });

      expect((await alice.get('/api/tasks').expect(200)).body).toHaveLength(1);
      await alice.delete(`/api/tasks/${created.taskId}`).expect(204);
      await alice.get(`/api/tasks/${created.taskId}`).expect(404);
    });

    it('validates the body and the date order', async () => {
      await alice
        .post('/api/tasks')
        .send({ ...task, frequency: 'Yearly' })
        .expect(400);
      await alice
        .post('/api/tasks')
        .send({ ...task, dueDate: '2026-02-30' })
        .expect(400);
      await alice
        .post('/api/tasks')
        .send({ ...task, taskName: 'ab' })
        .expect(400);
      await alice
        .post('/api/tasks')
        .send({ ...task, dueDate: '2026-05-01' })
        .expect(400);
    });

    it('takes the owner from the session, ignoring any userId in the body', async () => {
      const { userId } = (await alice.get('/api/auth/me')).body;
      const created = (
        await alice
          .post('/api/tasks')
          .send({ ...task, userId: 999_999 })
          .expect(201)
      ).body;
      expect(created.userId).toBe(userId);
    });
  });

  describe('ownership (no IDOR)', () => {
    it("returns 404 when reading, updating or deleting another user's data", async () => {
      const aliceTask = (await alice.post('/api/tasks').send(task).expect(201)).body;
      const aliceReminder = (
        await alice
          .post('/api/reminders')
          .send({ title: 'Llamar', reminderDateTime: '2026-06-10T16:45:00.000Z' })
          .expect(201)
      ).body;
      const aliceGoal = (
        await alice
          .post('/api/goals')
          .send({ goalName: 'Angular', startDate: '2026-06-01', endDate: '2026-06-30' })
          .expect(201)
      ).body;

      await bob.get(`/api/tasks/${aliceTask.taskId}`).expect(404);
      await bob.put(`/api/tasks/${aliceTask.taskId}`).send(task).expect(404);
      await bob.delete(`/api/tasks/${aliceTask.taskId}`).expect(404);
      await bob.get(`/api/reminders/${aliceReminder.reminderId}`).expect(404);
      await bob.delete(`/api/reminders/${aliceReminder.reminderId}`).expect(404);
      await bob.get(`/api/goals/${aliceGoal.goalId}`).expect(404);
      await bob
        .put(`/api/goals/${aliceGoal.goalId}`)
        .send({ goalName: 'Hack', startDate: '2026-06-01', endDate: '2026-06-30' })
        .expect(404);

      expect((await bob.get('/api/tasks')).body).toEqual([]);
      expect((await bob.get('/api/reminders')).body).toEqual([]);
      expect((await bob.get('/api/goals')).body).toEqual([]);
      // Los datos de Alice siguen intactos
      expect((await alice.get(`/api/tasks/${aliceTask.taskId}`).expect(200)).body.taskName).toBe('Leer');
    });
  });

  describe('goals and milestones', () => {
    const goal = {
      goalName: 'Aprender Angular',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      milestones: [
        { milestoneName: 'Signals', targetDate: '2026-06-10', isCompleted: true },
        { milestoneName: 'Router', targetDate: '2026-06-20' }
      ]
    };

    it('includes milestones in the list and derives isAchieved from them', async () => {
      await alice
        .post('/api/goals')
        .send({ ...goal, isAchieved: true })
        .expect(201);
      const [listed] = (await alice.get('/api/goals').expect(200)).body;

      expect(listed.milestones.map((m: { milestoneName: string }) => m.milestoneName)).toEqual(['Signals', 'Router']);
      expect(listed.isAchieved).toBe(false); // no todos los milestones están completados
    });

    it('replaces milestones on update: keeps ids, creates new ones and deletes missing ones', async () => {
      const created = (await alice.post('/api/goals').send(goal).expect(201)).body;
      const [signals] = created.milestones;

      const updated = (
        await alice
          .put(`/api/goals/${created.goalId}`)
          .send({
            ...goal,
            milestones: [
              { ...signals, isCompleted: true },
              { milestoneName: 'Forms', targetDate: '2026-06-25', isCompleted: true }
            ]
          })
          .expect(200)
      ).body;

      expect(updated.milestones).toHaveLength(2);
      expect(updated.milestones[0].milestoneId).toBe(signals.milestoneId);
      expect(updated.milestones[1].milestoneName).toBe('Forms');
      expect(updated.isAchieved).toBe(true);
    });

    it('rejects milestones outside the goal dates and ids from another goal', async () => {
      await alice
        .post('/api/goals')
        .send({ ...goal, milestones: [{ milestoneName: 'Tarde', targetDate: '2026-07-15' }] })
        .expect(400);

      const first = (await alice.post('/api/goals').send(goal).expect(201)).body;
      const second = (await alice.post('/api/goals').send(goal).expect(201)).body;
      await alice
        .put(`/api/goals/${second.goalId}`)
        .send({ ...goal, milestones: [first.milestones[0]] })
        .expect(400);
    });
  });

  describe('reminders', () => {
    it('stores the exact instant and supports acknowledging', async () => {
      const created = (
        await alice
          .post('/api/reminders')
          .send({ title: 'Llamar', reminderDateTime: '2026-06-10T16:45:00+02:00' })
          .expect(201)
      ).body;
      expect(created.reminderDateTime).toBe('2026-06-10T14:45:00.000Z');

      const updated = (
        await alice
          .put(`/api/reminders/${created.reminderId}`)
          .send({ ...created, isAcknowledged: true })
          .expect(200)
      ).body;
      expect(updated.isAcknowledged).toBe(true);
    });

    it('rejects a date without time or zone information', async () => {
      await alice.post('/api/reminders').send({ title: 'Llamar', reminderDateTime: '2026-06-10' }).expect(400);
    });
  });
});
