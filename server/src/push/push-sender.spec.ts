import { createECDH, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import webpush, { WebPushError } from 'web-push';
import { loadConfig } from '../config/app-config.js';
import { PushSender } from './push-sender.js';

const vapid = webpush.generateVAPIDKeys();
const config = loadConfig({
  DATABASE_URL: 'postgres://localhost/db',
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey
});

// Claves de un navegador de prueba (P-256), como las que da PushSubscription.toJSON()
const browserKeys = createECDH('prime256v1');
browserKeys.generateKeys();
const target = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  p256dh: browserKeys.getPublicKey().toString('base64url'),
  auth: randomBytes(16).toString('base64url')
};
const payload = { title: '⏰ Test', body: 'Body', tag: 'reminder-1', url: 'reminders' };

describe('PushSender', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds an encrypted request signed with the VAPID keys', () => {
    const details = webpush.generateRequestDetails(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject: 'mailto:test@example.com', ...vapid } }
    );
    expect(details.headers['Content-Encoding']).toBe('aes128gcm');
    expect(String(details.headers['Authorization'])).toContain(`k=${vapid.publicKey}`);
  });

  it('reports expired subscriptions as gone and rethrows other errors', async () => {
    const sender = new PushSender(config);
    const send = vi.spyOn(webpush, 'sendNotification');

    send.mockResolvedValueOnce({ statusCode: 201, body: '', headers: {} });
    await expect(sender.send(target, payload)).resolves.toBe('sent');

    send.mockRejectedValueOnce(new WebPushError('Gone', 410, {}, '', target.endpoint));
    await expect(sender.send(target, payload)).resolves.toBe('gone');

    send.mockRejectedValueOnce(new WebPushError('Server error', 500, {}, '', target.endpoint));
    await expect(sender.send(target, payload)).rejects.toThrow('Server error');
  });
});
