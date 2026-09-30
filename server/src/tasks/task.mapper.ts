import { Task, TaskFrequency } from './task.entity.js';

/** Forma de una tarea en la API (mismos nombres de campo que el modelo del frontend). */
export interface TaskResponse {
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

export function toTaskResponse(task: Task): TaskResponse {
  return {
    taskId: task.id,
    taskName: task.name,
    description: task.description,
    frequency: task.frequency,
    createdDate: task.createdAt.toISOString(),
    startDate: task.startDate,
    dueDate: task.dueDate,
    isCompleted: task.isCompleted,
    userId: task.userId
  };
}
