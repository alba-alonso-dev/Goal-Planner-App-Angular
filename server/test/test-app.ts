import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { MailService, OutgoingMail } from '../src/mail/mail.service.js';
import { PushPayload, PushResult, PushSender, PushTarget } from '../src/push/push-sender.js';

/** Base de datos de tests: nunca la de desarrollo. */
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgres://goal:goal@localhost:5432/goal_planner_test';

/** Emails "enviados" por la aplicación de test (MailService sustituido). */
export const sentMails: OutgoingMail[] = [];

/** Notificaciones push "enviadas" (PushSender sustituido). `pushResult` simula la respuesta del servicio. */
export const sentPushes: { target: PushTarget; payload: PushPayload }[] = [];
export const pushResult: { next: PushResult } = { next: 'sent' };

export async function createTestApp(): Promise<INestApplication> {
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  process.env['NODE_ENV'] = 'test';
  // Los tests registran muchos usuarios seguidos; el límite real se prueba aparte
  process.env['AUTH_RATE_LIMIT'] = '1000';
  // Push activado con claves de prueba; el planificador se invoca a mano en los tests
  process.env['VAPID_PUBLIC_KEY'] = 'test-public-key';
  process.env['VAPID_PRIVATE_KEY'] = 'test-private-key';
  process.env['PUSH_INTERVAL_SECONDS'] = '0';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({ send: async (mail: OutgoingMail) => void sentMails.push(mail) })
    .overrideProvider(PushSender)
    .useValue({
      send: async (target: PushTarget, payload: PushPayload) => {
        sentPushes.push({ target, payload });
        return pushResult.next;
      }
    })
    .compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication): Promise<void> {
  await app.get(DataSource).query('TRUNCATE users, tasks, goals, milestones, reminders RESTART IDENTITY CASCADE');
}

let userCounter = 0;

/** Registra un usuario nuevo y devuelve un agente con su cookie de sesión. */
export async function signUp(app: INestApplication) {
  const agent = request.agent(app.getHttpServer());
  const email = `user${++userCounter}-${Date.now()}@example.com`;
  const response = await agent
    .post('/api/auth/register')
    .send({ fullName: 'Test User', emailId: email, password: 'supersecret', mobileNo: '600000000' })
    .expect(201);
  return { agent, email, password: 'supersecret', userId: response.body.userId as number };
}
