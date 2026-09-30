export type TaskFrequency = 'Daily' | 'Weekly' | 'Monthly';

/** Tarea tal como la devuelve la API. */
export interface TaskResponse {
  taskId: number;
  taskName: string;
  description: string;
  frequency: TaskFrequency;
  /** Instante de creación (ISO 8601). */
  createdDate: string;
  /** Días naturales `YYYY-MM-DD`. */
  startDate: string;
  dueDate: string;
  isCompleted: boolean;
  userId: number;
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
export type TaskInput = Pick<TaskResponse, 'taskName' | 'description' | 'frequency' | 'startDate' | 'dueDate'> &
  Partial<Pick<TaskResponse, 'isCompleted'>>;
