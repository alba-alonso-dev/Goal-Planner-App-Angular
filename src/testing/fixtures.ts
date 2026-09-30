import { signal } from '@angular/core';
import { ClockService } from '../app/core/time/clock.service';
import { toGoalView } from '../app/features/goals/domain/goal.rules';
import { GoalResponse } from '../app/features/goals/goal.model';
import { toReminderView } from '../app/features/reminders/domain/reminder.rules';
import { ReminderResponse } from '../app/features/reminders/reminder.model';
import { toTaskView } from '../app/features/tasks/domain/task.rules';
import { TaskResponse } from '../app/features/tasks/task.model';

// Datos de prueba compartidos por los specs.

/** Fecha fija para que los campos derivados (vencido, días restantes...) sean deterministas. */
export const FIXED_NOW = new Date(2026, 5, 10, 12, 0); // 10 de junio de 2026, 12:00 (hora local)

/** Provider que sustituye el reloj real por FIXED_NOW. */
export const provideFixedClock = (now: Date = FIXED_NOW) => ({
  provide: ClockService,
  useValue: { now: signal(now).asReadonly() }
});

export const TEST_USER = { userId: 1, emailId: 'test@example.com', fullName: 'Test', mobileNo: '600000000' };

/** Deja una sesión guardada para que AuthService arranque autenticado. */
export const loginTestUser = () => localStorage.setItem('user', JSON.stringify(TEST_USER));

const day = (month: number, date: number) => new Date(2026, month - 1, date).toISOString();

export const mockGoalResponse: GoalResponse = {
  goalId: 1,
  goalName: 'Aprender Angular',
  description: 'Completar el curso',
  startDate: day(1, 1),
  endDate: day(12, 31),
  isAchieved: false,
  userId: 1,
  milestones: [
    { milestoneId: 1, milestoneName: 'Signals', description: '', targetDate: day(3, 1), isCompleted: true },
    { milestoneId: 2, milestoneName: 'Router', description: '', targetDate: day(6, 1), isCompleted: false }
  ]
};

export const mockTaskResponse: TaskResponse = {
  taskId: 1,
  taskName: 'Leer documentación',
  description: '',
  frequency: 'Daily',
  createdDate: day(1, 1),
  startDate: day(1, 1),
  dueDate: day(6, 20),
  isCompleted: false,
  userId: 1
};

export const mockReminderResponse: ReminderResponse = {
  reminderId: 1,
  title: 'Revisar objetivos',
  description: '',
  reminderDateTime: new Date(2026, 5, 11, 10, 0).toISOString(),
  isAcknowledged: false,
  userId: 1
};

// Vistas (con campos derivados) para los componentes de UI
export const mockGoal = toGoalView(mockGoalResponse, FIXED_NOW);
export const mockTask = toTaskView(mockTaskResponse, FIXED_NOW);
export const mockReminder = toReminderView(mockReminderResponse, FIXED_NOW);
