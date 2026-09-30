import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushController } from './push.controller.js';
import { PushSender } from './push-sender.js';
import { PushSubscriptionEntity } from './push-subscription.entity.js';
import { PushService } from './push.service.js';
import { ReminderPushScheduler } from './reminder-push.scheduler.js';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushController],
  providers: [PushService, PushSender, ReminderPushScheduler]
})
export class PushModule {}
