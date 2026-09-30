import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ReminderDto } from './dto/reminder.dto.js';
import { toReminderResponse, ReminderResponse } from './reminder.mapper.js';
import { RemindersService } from './reminders.service.js';

@Controller('reminders')
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get()
  async findAll(@CurrentUserId() userId: number): Promise<ReminderResponse[]> {
    return (await this.reminders.findAll(userId)).map(toReminderResponse);
  }

  @Get(':id')
  async findOne(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<ReminderResponse> {
    return toReminderResponse(await this.reminders.findOne(userId, id));
  }

  @Post()
  async create(@CurrentUserId() userId: number, @Body() dto: ReminderDto): Promise<ReminderResponse> {
    return toReminderResponse(await this.reminders.create(userId, dto));
  }

  @Put(':id')
  async update(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReminderDto
  ): Promise<ReminderResponse> {
    return toReminderResponse(await this.reminders.update(userId, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: number, @Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.reminders.remove(userId, id);
  }
}
