import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateNested } from 'class-validator';
import { MAIL_LOCALES, type MailLocale } from '../../auth/dto/auth.dto.js';

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export class PushKeysDto {
  @Matches(BASE64URL)
  @MaxLength(200)
  p256dh!: string;

  @Matches(BASE64URL)
  @MaxLength(100)
  auth!: string;
}

/** Forma de `PushSubscription.toJSON()` en el navegador, más el idioma. */
export class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;

  @IsOptional()
  @IsIn(MAIL_LOCALES)
  locale?: MailLocale;
}

export class PushUnsubscribeDto {
  @IsString()
  @MaxLength(1000)
  endpoint!: string;
}
