import { GoalResponse } from '../app/model/goal';
import { ReminderResponse } from '../app/model/reminder';
import { TaskResponse } from '../app/model/task';

// Datos de prueba compartidos por los specs de componentes con inputs obligatorios

export const mockGoal: GoalResponse = {
  goalId: 1,
  goalName: 'Aprender Angular',
  description: 'Completar el curso',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  isAchieved: false,
  userId: 1,
  progress: 50,
  milestones: [
    { milestoneId: 1, milestoneName: 'Signals', description: '', targetDate: '2026-03-01T00:00:00.000Z', isCompleted: true },
    { milestoneId: 2, milestoneName: 'Router', description: '', targetDate: '2026-06-01T00:00:00.000Z', isCompleted: false }
  ]
};

export const mockTask: TaskResponse = {
  taskId: 1,
  taskName: 'Leer documentación',
  description: '',
  frequency: 'Daily',
  createdDate: '2026-01-01T00:00:00.000Z',
  startDate: '2026-01-01T00:00:00.000Z',
  dueDate: '2026-12-31T00:00:00.000Z',
  isCompleted: false,
  userId: 1,
  progress: 0,
  daysRemaining: 10,
  isOverdue: false
};

export const mockReminder: ReminderResponse = {
  reminderId: 1,
  title: 'Revisar objetivos',
  description: '',
  reminderDateTime: '2026-12-31T10:00:00.000Z',
  isAcknowledged: false,
  userId: 1,
  timeRemaining: '1 day',
  isOverdue: false,
  isToday: false,
  isTomorrow: true,
  formattedDateTime: '31 de diciembre de 2026, 11:00'
};
