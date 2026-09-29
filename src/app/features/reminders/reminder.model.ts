export interface ReminderRequest {
  reminderId: number;
  title: string;
  description: string;
  reminderDateTime: string;
  isAcknowledged: boolean;
  userId: number;
}

/** Recordatorio tal como lo devuelve la API. */
export interface ReminderResponse extends ReminderRequest {
  /** @deprecated Usar ReminderView (se elimina al migrar a stores). */
  timeRemaining?: string;
  /** @deprecated Usar ReminderView (se elimina al migrar a stores). */
  isOverdue?: boolean;
  /** @deprecated Usar ReminderView (se elimina al migrar a stores). */
  isToday?: boolean;
  /** @deprecated Usar ReminderView (se elimina al migrar a stores). */
  isTomorrow?: boolean;
  /** @deprecated Usar ReminderView (se elimina al migrar a stores). */
  formattedDateTime?: string;
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
  formattedDateTime: string;
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
export type ReminderInput = Pick<ReminderRequest, 'title' | 'description' | 'reminderDateTime'> &
  Partial<Pick<ReminderRequest, 'isAcknowledged'>>;
