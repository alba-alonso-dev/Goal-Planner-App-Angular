import { Reminder } from './reminder.entity.js';

export interface ReminderResponse {
  reminderId: number;
  title: string;
  description: string;
  reminderDateTime: string;
  isAcknowledged: boolean;
  userId: number;
}

export function toReminderResponse(reminder: Reminder): ReminderResponse {
  return {
    reminderId: reminder.id,
    title: reminder.title,
    description: reminder.description,
    reminderDateTime: reminder.remindAt.toISOString(),
    isAcknowledged: reminder.isAcknowledged,
    userId: reminder.userId
  };
}
