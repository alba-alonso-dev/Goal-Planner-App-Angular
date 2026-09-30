import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PushSubscriptionDto } from './dto/push-subscription.dto.js';
import { isAllowedPushEndpoint } from './push-endpoints.js';
import { PushPayload, PushSender } from './push-sender.js';
import { PushSubscriptionEntity } from './push-subscription.entity.js';

interface DueReminder {
  id: number;
  user_id: number;
  title: string;
  description: string;
}

const DEFAULT_BODY: Record<string, string> = {
  en: 'It is time for this reminder.',
  es: 'Ha llegado la hora de este recordatorio.'
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscriptionEntity) private readonly subscriptions: Repository<PushSubscriptionEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(PushSender) private readonly sender: PushSender,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  /** Clave pública VAPID para `pushManager.subscribe`; null si el push no está configurado. */
  publicKey(): string | null {
    return this.config.vapid?.publicKey ?? null;
  }

  /**
   * Guarda (o reasigna) la suscripción de este navegador al usuario actual: si otra persona inicia
   * sesión en el mismo navegador, las notificaciones pasan a ser suyas.
   */
  async subscribe(userId: number, dto: PushSubscriptionDto): Promise<void> {
    if (!this.config.vapid) throw new BadRequestException('Push notifications are not enabled on this server');
    if (!isAllowedPushEndpoint(dto.endpoint)) throw new BadRequestException('Unsupported push service');
    await this.subscriptions.upsert(
      {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        locale: dto.locale ?? 'en'
      },
      ['endpoint']
    );
  }

  /** Solo borra la suscripción si es del usuario (un endpoint ajeno no se puede tocar). */
  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.subscriptions.delete({ userId, endpoint });
  }

  /**
   * Notifica los recordatorios que han vencido (hasta hace una hora) a los usuarios con alguna
   * suscripción. Cada recordatorio se "reclama" con un UPDATE condicional, así que no se notifica
   * dos veces aunque haya varias instancias del servidor. Devuelve cuántos recordatorios notificó.
   */
  async sendDueReminders(): Promise<number> {
    if (!this.config.vapid) return 0;
    const [due] = (await this.dataSource.query(
      `UPDATE reminders SET notified_at = now()
       WHERE notified_at IS NULL AND NOT is_acknowledged
         AND remind_at <= now() AND remind_at > now() - interval '1 hour'
         AND user_id IN (SELECT user_id FROM push_subscriptions)
       RETURNING id, user_id, title, description`
    )) as [DueReminder[], number];

    for (const reminder of due) {
      const targets = await this.subscriptions.findBy({ userId: reminder.user_id });
      await Promise.all(targets.map(target => this.deliver(target, reminder)));
    }
    return due.length;
  }

  private async deliver(target: PushSubscriptionEntity, reminder: DueReminder): Promise<void> {
    const payload: PushPayload = {
      title: `⏰ ${reminder.title}`,
      body: reminder.description || (DEFAULT_BODY[target.locale] ?? DEFAULT_BODY['en']!),
      tag: `reminder-${reminder.id}`,
      url: 'reminders'
    };
    try {
      if ((await this.sender.send(target, payload)) === 'gone') {
        await this.subscriptions.delete({ id: target.id });
      }
    } catch (error) {
      this.logger.warn(`Push to subscription ${target.id} failed: ${String(error)}`);
    }
  }
}
