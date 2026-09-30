/** Recordatorio tal como lo devuelve la API. */
export interface ReminderResponse {
  reminderId: number;
  title: string;
  description: string;
  /** Instante ISO 8601 con zona. */
  reminderDateTime: string;
  isAcknowledged: boolean;
  userId: number;
}

/**
 * Momento de un recordatorio pendiente respecto a ahora. Las categorías son excluyentes:
 * un recordatorio de esta mañana que ya pasó es `overdue`, no `today`.
 */
export type ReminderBucket = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

/** Recordatorio con los campos derivados que usa la interfaz (dependen de la fecha actual). */
export interface ReminderView extends ReminderResponse {
  timeRemaining: string;
  /** null si ya está reconocido. */
  bucket: ReminderBucket | null;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

export interface ReminderStats {
  total: number;
  acknowledged: number;
  /** Pendientes que aún no han vencido. */
  pending: number;
  overdue: number;
  today: number;
  tomorrow: number;
  /** Del día siguiente a mañana hasta dentro de 7 días. */
  thisWeek: number;
  later: number;
}

export type ReminderFilter = 'all' | 'pending' | 'acknowledged' | 'overdue';

// Datos que aportan los formularios para crear/actualizar un recordatorio
export type ReminderInput = Pick<ReminderResponse, 'title' | 'description' | 'reminderDateTime'> &
  Partial<Pick<ReminderResponse, 'isAcknowledged'>>;
