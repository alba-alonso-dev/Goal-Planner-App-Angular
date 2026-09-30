import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { ClockService } from '../../../core/time/clock.service';
import { ReminderView } from '../reminder.model';
import { ReminderStore } from './reminder.store';

export type AlertPermission = NotificationPermission | 'unsupported';

/**
 * Avisa cuando llega la hora de un recordatorio mientras la aplicación está abierta: siempre con un
 * toast y, si el usuario lo ha permitido, con una notificación del sistema.
 *
 * Solo avisa de los recordatorios que vencen desde que se abrió la sesión (no de los ya vencidos al
 * cargar) y de cada uno una sola vez. Las notificaciones con la app cerrada requerirían Web Push.
 */
@Injectable({ providedIn: 'root' })
export class ReminderAlertsService {
  private store = inject(ReminderStore);
  private auth = inject(AuthService);
  private clock = inject(ClockService);
  private toasts = inject(NotificationService);
  private window = inject(DOCUMENT).defaultView;

  private readonly _permission = signal<AlertPermission>(this.readPermission());
  readonly permission = this._permission.asReadonly();
  readonly canRequestPermission = computed(() => this._permission() === 'default');

  private lastCheck = this.clock.now().getTime();
  private readonly notified = new Set<number>();

  constructor() {
    // Con sesión, se cargan los recordatorios (si no lo estaban) para poder avisar desde cualquier página
    effect(() => {
      const user = this.auth.loggedUser();
      untracked(() => {
        this.notified.clear();
        this.lastCheck = this.clock.now().getTime();
        if (user) this.store.load();
      });
    });

    effect(() => {
      const now = this.clock.now().getTime();
      const reminders = this.store.reminders();
      untracked(() => this.check(now, reminders));
    });
  }

  /** Debe llamarse desde un gesto del usuario (los navegadores lo exigen). */
  async requestPermission(): Promise<void> {
    const api = this.window?.Notification;
    if (!api) return;
    this._permission.set(await api.requestPermission());
  }

  private check(now: number, reminders: readonly ReminderView[]): void {
    const due = reminders.filter(r => {
      const at = new Date(r.reminderDateTime).getTime();
      return !r.isAcknowledged && !this.notified.has(r.reminderId) && at > this.lastCheck && at <= now;
    });
    this.lastCheck = Math.max(this.lastCheck, now);

    for (const reminder of due) {
      this.notified.add(reminder.reminderId);
      this.toasts.warning(
        reminder.description || $localize`It is time for this reminder.`,
        `⏰ ${reminder.title}`,
        10_000
      );
      this.showSystemNotification(reminder);
    }
  }

  private showSystemNotification(reminder: ReminderView): void {
    const api = this.window?.Notification;
    if (!api || api.permission !== 'granted') return;
    new api(reminder.title, { body: reminder.description || undefined, tag: `reminder-${reminder.reminderId}` });
  }

  private readPermission(): AlertPermission {
    return this.window && 'Notification' in this.window ? this.window.Notification.permission : 'unsupported';
  }
}
