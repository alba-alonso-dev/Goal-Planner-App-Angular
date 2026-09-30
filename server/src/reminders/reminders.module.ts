import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reminder } from './reminder.entity.js';

import { RemindersController } from './reminders.controller.js';
import { RemindersService } from './reminders.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder])],
  controllers: [RemindersController],
  providers: [RemindersService]
})
export class RemindersModule {}
