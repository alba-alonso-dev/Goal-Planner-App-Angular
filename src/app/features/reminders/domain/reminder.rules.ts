import { daysBetween } from '../../../shared/utils/date';
import { currentLocale } from '../../../shared/utils/locale';
import { ReminderBucket, ReminderFilter, ReminderResponse, ReminderStats, ReminderView } from '../reminder.model';

// Reglas de negocio de los recordatorios. Funciones puras: todo lo que depende del tiempo recibe `now`.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Categoría temporal de un recordatorio pendiente; null si ya está reconocido. */
export function reminderBucket(reminder: ReminderResponse, now: Date): ReminderBucket | null {
  if (reminder.isAcknowledged) return null;
  const date = new Date(reminder.reminderDateTime);
  if (date.getTime() < now.getTime()) return 'overdue';

  const days = daysBetween(now, date);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'thisWeek';
  return 'later';
}

/** "45 minutes" / "45 minutos": Intl resuelve el plural de cada idioma. */
const duration = (value: number, unit: 'minute' | 'hour' | 'day', locale: string) =>
  new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);

/** Texto corto con el tiempo que falta: "Overdue", "45 minutes", "3 hours", "2 days". */
export function timeRemaining(reminder: ReminderResponse, now: Date, locale = currentLocale()): string {
  const diff = new Date(reminder.reminderDateTime).getTime() - now.getTime();
  if (diff < 0) return $localize`Overdue`;
  if (diff < HOUR) return duration(Math.floor(diff / MINUTE), 'minute', locale);
  if (diff < 24 * HOUR) return duration(Math.floor(diff / HOUR), 'hour', locale);
  return duration(Math.floor(diff / (24 * HOUR)), 'day', locale);
}

export function toReminderView(reminder: ReminderResponse, now: Date, locale = currentLocale()): ReminderView {
  const bucket = reminderBucket(reminder, now);
  const days = daysBetween(now, reminder.reminderDateTime);
  return {
    ...reminder,
    description: reminder.description || '',
    bucket,
    isOverdue: bucket === 'overdue',
    isToday: days === 0,
    isTomorrow: days === 1,
    timeRemaining: timeRemaining(reminder, now, locale)
  };
}

export function reminderStats(reminders: readonly ReminderView[]): ReminderStats {
  const count = (bucket: ReminderBucket) => reminders.filter(r => r.bucket === bucket).length;
  const acknowledged = reminders.filter(r => r.isAcknowledged).length;
  const overdue = count('overdue');
  return {
    total: reminders.length,
    acknowledged,
    overdue,
    pending: reminders.length - acknowledged - overdue,
    today: count('today'),
    tomorrow: count('tomorrow'),
    thisWeek: count('thisWeek'),
    later: count('later')
  };
}

export function matchesReminderFilter(reminder: ReminderView, filter: ReminderFilter): boolean {
  switch (filter) {
    case 'pending':
      return !reminder.isAcknowledged && !reminder.isOverdue;
    case 'acknowledged':
      return reminder.isAcknowledged;
    case 'overdue':
      return reminder.isOverdue;
    default:
      return true;
  }
}

export function matchesReminderSearch(reminder: ReminderResponse, search: string): boolean {
  const term = search.trim().toLowerCase();
  return !term || reminder.title.toLowerCase().includes(term) || reminder.description?.toLowerCase().includes(term);
}

export function selectReminders(
  reminders: readonly ReminderView[],
  options: { filter: ReminderFilter; search: string }
): ReminderView[] {
  return reminders.filter(r => matchesReminderFilter(r, options.filter) && matchesReminderSearch(r, options.search));
}
