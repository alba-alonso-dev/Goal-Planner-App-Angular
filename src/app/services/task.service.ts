import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../core/config/api.config';
import { toApiDate } from '../shared/utils/date';
import { TaskInput, TaskRequest, TaskResponse, TaskStats } from '../model/task';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  /**
   * Crear una nueva tarea
   */
  createTask(taskData: TaskInput): Observable<TaskResponse> {
    return this.authService.withUser(user => {
      const requestBody: TaskRequest = {
        taskId: 0,
        taskName: taskData.taskName.trim(),
        description: taskData.description?.trim() || '',
        frequency: taskData.frequency,
        createdDate: new Date().toISOString(),
        startDate: toApiDate(taskData.startDate),
        dueDate: toApiDate(taskData.dueDate),
        isCompleted: false,
        userId: user.userId
      };

      return this.http
        .post<TaskResponse>(`${this.apiUrl}/createTask`, requestBody)
        .pipe(map(response => this.transformTaskResponse(response)));
    });
  }

  /**
   * Obtener todas las tareas de un usuario
   */
  getAllTasksByUser(): Observable<TaskResponse[]> {
    return this.authService.withUser(user =>
      this.http
        .get<TaskResponse[]>(`${this.apiUrl}/getAllTasks`, { params: { userId: user.userId } })
        .pipe(map(tasks => tasks.map(task => this.transformTaskResponse(task))))
    );
  }

  /**
   * Obtener una tarea específica por ID
   */
  getTaskById(taskId: number): Observable<TaskResponse> {
    return this.http
      .get<TaskResponse>(`${this.apiUrl}/getTask/${taskId}`)
      .pipe(map(response => this.transformTaskResponse(response)));
  }

  /**
   * Actualizar una tarea existente
   */
  updateTask(taskId: number, taskData: TaskInput): Observable<unknown> {
    return this.authService.withUser(user => {
      const requestBody: TaskRequest = {
        taskId: taskId,
        taskName: taskData.taskName.trim(),
        description: taskData.description?.trim() || '',
        frequency: taskData.frequency,
        createdDate: taskData.createdDate || new Date().toISOString(),
        startDate: toApiDate(taskData.startDate),
        dueDate: toApiDate(taskData.dueDate),
        isCompleted: taskData.isCompleted || false,
        userId: user.userId
      };

      return this.http.put(`${this.apiUrl}/updateTask/${taskId}`, requestBody);
    });
  }

  /**
   * Marcar tarea como completada/no completada.
   * Usa los datos que ya tiene el cliente en lugar de volver a pedir la tarea (1 petición en vez de 2).
   */
  toggleTaskCompletion(task: TaskResponse): Observable<unknown> {
    return this.updateTask(task.taskId, { ...task, isCompleted: !task.isCompleted });
  }

  /**
   * Eliminar una tarea
   */
  deleteTask(taskId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/deleteTask/${taskId}`);
  }

  /**
   * Transformar respuesta de la API con campos calculados
   */
  private transformTaskResponse(task: TaskResponse): TaskResponse {
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      taskId: task.taskId,
      taskName: task.taskName,
      description: task.description || '',
      frequency: task.frequency,
      createdDate: task.createdDate,
      startDate: task.startDate,
      dueDate: task.dueDate,
      isCompleted: task.isCompleted,
      userId: task.userId,
      // Campos calculados
      progress: task.isCompleted ? 100 : 0,
      daysRemaining: diffDays,
      isOverdue: !task.isCompleted && dueDate < today
    };
  }

  /**
   * Obtener estadísticas de tareas
   */
  getTaskStats(tasks: TaskResponse[]): TaskStats {
    const today = new Date();

    return {
      total: tasks.length,
      completed: tasks.filter(t => t.isCompleted).length,
      pending: tasks.filter(t => !t.isCompleted && new Date(t.dueDate) >= today).length,
      overdue: tasks.filter(t => !t.isCompleted && new Date(t.dueDate) < today).length
    };
  }
}
