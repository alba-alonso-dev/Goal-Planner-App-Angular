import { Inject, Injectable } from '@nestjs/common';
import webpush, { WebPushError } from 'web-push';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Las notificaciones con la misma etiqueta se sustituyen en lugar de acumularse. */
  tag: string;
  /** Ruta relativa al scope del Service Worker que se abre al pulsar la notificación. */
  url: string;
}

/** `gone`: el servicio de push ya no reconoce la suscripción (hay que borrarla). */
export type PushResult = 'sent' | 'gone';

/** Envío de Web Push firmado con VAPID. Aislado en una clase para sustituirlo en los tests. */
@Injectable()
export class PushSender {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async send(target: PushTarget, payload: PushPayload): Promise<PushResult> {
    const vapid = this.config.vapid;
    if (!vapid) throw new Error('Web Push is not configured (VAPID keys)');
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(payload),
        {
          vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
          TTL: 60 * 60,
          urgency: 'high'
        }
      );
      return 'sent';
    } catch (error) {
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return 'gone';
      throw error;
    }
  }
}
