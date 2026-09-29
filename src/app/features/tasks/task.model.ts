export type TaskFrequency = 'Daily' | 'Weekly' | 'Monthly';

export interface TaskRequest {
  taskId: number;
  taskName: string;
  description: string;
  frequency: TaskFrequency;
  createdDate: string;
  startDate: string;
  dueDate: string;
  isCompleted: boolean;
  userId: number;
}

/** Tarea tal como la devuelve la API. */
export interface TaskResponse extends TaskRequest {
  /** @deprecated Usar TaskView (se elimina al migrar a stores). */
  progress?: number;
  /** @deprecated Usar TaskView (se elimina al migrar a stores). */
  daysRemaining?: number;
  /** @deprecated Usar TaskView (se elimina al migrar a stores). */
  isOverdue?: boolean;
}

/** Tarea con los campos derivados que usa la interfaz (dependen de la fecha actual). */
export interface TaskView extends TaskResponse {
  progress: number;
  /** Días naturales hasta el vencimiento (negativo si ya venció). */
  daysRemaining: number;
  isOverdue: boolean;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';

// Datos que aportan los formularios para crear/actualizar una tarea
export type TaskInput = Pick<TaskRequest, 'taskName' | 'description' | 'frequency' | 'startDate' | 'dueDate'> &
  Partial<Pick<TaskRequest, 'isCompleted' | 'createdDate'>>;
