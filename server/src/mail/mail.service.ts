import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envío de emails. Con `SMTP_URL` usa ese servidor; sin él (solo fuera de producción) no envía nada:
 * registra el email en el log y, si hay `MAIL_OUTBOX_DIR`, lo guarda como JSON (lo usan los e2e).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.transport = config.smtpUrl
      ? nodemailer.createTransport(config.smtpUrl, { from: config.mailFrom })
      : nodemailer.createTransport({ jsonTransport: true }, { from: config.mailFrom });
  }

  async send(mail: OutgoingMail): Promise<void> {
    await this.transport.sendMail(mail);
    if (this.config.smtpUrl) return;

    this.logger.log(`Email to ${mail.to} (not sent, SMTP_URL is not set): ${mail.subject}\n${mail.text}`);
    if (this.config.mailOutboxDir) {
      await mkdir(this.config.mailOutboxDir, { recursive: true });
      const file = join(this.config.mailOutboxDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      await writeFile(file, JSON.stringify(mail));
    }
  }
}
