import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderDto } from './dto/reminder.dto.js';
import { Reminder } from './reminder.entity.js';

/** Todas las operaciones se limitan a los recordatorios del usuario indicado. */
@Injectable()
export class RemindersService {
  constructor(@InjectRepository(Reminder) private readonly reminders: Repository<Reminder>) {}

  findAll(userId: number): Promise<Reminder[]> {
    return this.reminders.find({ where: { userId }, order: { remindAt: 'ASC', id: 'ASC' } });
  }

  async findOne(userId: number, id: number): Promise<Reminder> {
    const reminder = await this.reminders.findOneBy({ id, userId });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return reminder;
  }

  create(userId: number, dto: ReminderDto): Promise<Reminder> {
    return this.reminders.save(this.reminders.create({ userId, ...this.fields(dto) }));
  }

  async update(userId: number, id: number, dto: ReminderDto): Promise<Reminder> {
    const reminder = await this.findOne(userId, id);
    const fields = this.fields(dto);
    // Si cambia la hora, se vuelve a notificar cuando llegue la nueva
    if (fields.remindAt!.getTime() !== reminder.remindAt.getTime()) fields.notifiedAt = null;
    return this.reminders.save(Object.assign(reminder, fields));
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.reminders.remove(await this.findOne(userId, id));
  }

  private fields(dto: ReminderDto): Partial<Reminder> {
    return {
      title: dto.title,
      description: dto.description ?? '',
      remindAt: new Date(dto.reminderDateTime),
      isAcknowledged: dto.isAcknowledged ?? false
    };
  }
}
