import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { PushSubscriptionDto, PushUnsubscribeDto } from './dto/push-subscription.dto.js';
import { PushService } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(@Inject(PushService) private readonly push: PushService) {}

  /** `publicKey` null: el servidor no tiene Web Push configurado. */
  @Public()
  @Get('config')
  config(): { publicKey: string | null } {
    return { publicKey: this.push.publicKey() };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('subscriptions')
  subscribe(@CurrentUserId() userId: number, @Body() dto: PushSubscriptionDto): Promise<void> {
    return this.push.subscribe(userId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('subscriptions')
  unsubscribe(@CurrentUserId() userId: number, @Body() dto: PushUnsubscribeDto): Promise<void> {
    return this.push.unsubscribe(userId, dto.endpoint);
  }
}
