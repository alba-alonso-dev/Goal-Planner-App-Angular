import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { MailService } from '../mail/mail.service.js';
import { User } from '../users/user.entity.js';
import { MailLocale } from './dto/auth.dto.js';
import { hashPassword } from './password.js';
import { PasswordResetToken } from './password-reset-token.entity.js';
import { passwordResetMail } from './password-reset.mail.js';

const TOKEN_TTL_MS = 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordResetToken) private readonly tokens: Repository<PasswordResetToken>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  /**
   * Envía un enlace de un solo uso si la cuenta existe. La respuesta es la misma exista o no, y el
   * email se envía en segundo plano para que el tiempo de respuesta tampoco lo revele.
   */
  async request(email: string, locale: MailLocale = 'en'): Promise<void> {
    const user = await this.users.findOneBy({ email });
    if (!user) return;

    // Solo vale el último enlace pedido
    await this.tokens.delete({ userId: user.id, usedAt: IsNull() });
    const token = randomBytes(32).toString('base64url');
    await this.tokens.save(
      this.tokens.create({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) })
    );

    const link = `${this.config.appUrl}/reset-password?token=${token}`;
    this.mail
      .send(passwordResetMail(user.email, link, locale))
      .catch(error => this.logger.error(`Could not send the password reset email: ${String(error)}`));
  }

  /** Consume el token (una sola vez, antes de caducar), cambia la contraseña y cierra todas las sesiones. */
  async reset(token: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.dataSource.transaction(async manager => {
      // UPDATE condicional: dos peticiones simultáneas con el mismo token no pueden usarlo las dos
      // (con UPDATE, el driver de PostgreSQL devuelve [filas, número de filas])
      const [rows] = (await manager.query(
        `UPDATE password_reset_tokens SET used_at = now()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING user_id`,
        [sha256(token)]
      )) as [{ user_id: number }[], number];
      const userId = rows[0]?.user_id;
      if (!userId) throw new BadRequestException('This reset link is invalid or has expired');

      await manager
        .createQueryBuilder()
        .update(User)
        .set({ passwordHash, sessionVersion: () => 'session_version + 1' })
        .where('id = :userId', { userId })
        .execute();
      await manager.delete(PasswordResetToken, { userId, usedAt: IsNull() });
    });
  }
}
