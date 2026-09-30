import { signal } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../app/core/auth/auth.service';
import { errorInterceptor } from '../app/core/http/error.interceptor';
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

/**
 * Inicia sesión como TEST_USER a través de AuthService (la sesión real vive en una cookie HttpOnly).
 * Requiere provideHttpClientTesting() en el TestBed.
 */
export function signInTestUser(user = TEST_USER): void {
  TestBed.inject(AuthService).login({ emailId: user.emailId, password: 'secret-password' }).subscribe();
  TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush(user);
}

/** Día natural YYYY-MM-DD (formato de la API para los campos sin hora). */
const day = (month: number, date: number) => `2026-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

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
  createdDate: new Date(2026, 0, 1, 9).toISOString(),
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

/** Escribe en un campo como lo haría el usuario (dispara `input` para que lo vea el formulario). */
export function typeInto(root: HTMLElement, selector: string, value: string): void {
  const field = root.querySelector<HTMLInputElement>(selector);
  if (!field) throw new Error(`No field matches ${selector}`);
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('blur'));
}

/** Pulsa el botón cuyo texto contiene `text`. */
export function clickButton(root: HTMLElement, text: string): void {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text));
  if (!button) throw new Error(`No button with text "${text}"`);
  button.click();
}

/** Elige una opción de un <select> como lo haría el usuario. */
export function selectOption(root: HTMLElement, selector: string, value: string): void {
  const select = root.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`No select matches ${selector}`);
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

/** Botón cuyo texto contiene `text` (para comprobar si está deshabilitado). */
export function findButton(root: HTMLElement, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(text));
  if (!button) throw new Error(`No button with text "${text}"`);
  return button;
}

/** Providers habituales de los tests de componentes con datos: HTTP de test (con el interceptor real), router y reloj fijo. */
export function provideDataTesting() {
  return [
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideHttpClientTesting(),
    provideRouter([]),
    provideFixedClock()
  ];
}
