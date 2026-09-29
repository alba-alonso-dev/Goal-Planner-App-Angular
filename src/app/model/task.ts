export interface TaskRequest {
  taskId: number;
  taskName: string;
  description: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  createdDate: string;
  startDate: string;
  dueDate: string;
  isCompleted: boolean;
  userId: number;
}

export interface TaskResponse {
  taskId: number;
  taskName: string;
  description: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  createdDate: string;
  startDate: string;
  dueDate: string;
  isCompleted: boolean;
  userId: number;
  // Campos calculados para el frontend
  progress?: number; // Para tareas completadas vs no completadas
  daysRemaining?: number;
  isOverdue?: boolean;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}
// Datos que aportan los formularios para crear/actualizar una tarea
export type TaskInput = Pick<TaskRequest, 'taskName' | 'description' | 'frequency' | 'startDate' | 'dueDate'> &
  Partial<Pick<TaskRequest, 'isCompleted' | 'createdDate'>>;
