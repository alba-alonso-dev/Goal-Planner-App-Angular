import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PushService } from './push.service.js';

/** Revisa periódicamente los recordatorios vencidos y los notifica por Web Push. */
@Injectable()
export class ReminderPushScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReminderPushScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(PushService) private readonly push: PushService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.vapid || this.config.pushIntervalSeconds <= 0) {
      this.logger.log('Web Push reminders are disabled (no VAPID keys or PUSH_INTERVAL_SECONDS=0)');
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.config.pushIntervalSeconds * 1000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return; // una pasada lenta no se solapa con la siguiente
    this.running = true;
    try {
      await this.push.sendDueReminders();
    } catch (error) {
      this.logger.error(`Could not send reminder notifications: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
