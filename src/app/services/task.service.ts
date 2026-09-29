import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { TaskRequest, TaskResponse, TaskStats } from '../model/task';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private baseUrl = 'https://api.freeprojectapi.com/api';

  /**
   * Crear una nueva tarea
   */
  createTask(taskData: any): Observable<TaskResponse> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/createTask`;

    const requestBody: TaskRequest = {
      taskId: 0,
      taskName: taskData.taskName.trim(),
      description: taskData.description?.trim() || '',
      frequency: taskData.frequency,
      createdDate: new Date().toISOString(),
      startDate: this.formatToISOString(taskData.startDate),
      dueDate: this.formatToISOString(taskData.dueDate),
      isCompleted: false,
      userId: user.userId
    };

    return this.http.post<TaskResponse>(url, requestBody).pipe(
      map(response => this.transformTaskResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todas las tareas de un usuario
   */
  getAllTasksByUser(): Observable<TaskResponse[]> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/getAllTasks`;
    

    return this.http.get<any[]>(url, { 
      params: { userId: user.userId.toString() } 
    }).pipe(
      map(tasks => tasks.map(task => this.transformTaskResponse(task))),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener una tarea específica por ID
   */
  getTaskById(taskId: number): Observable<TaskResponse> {
    const url = `${this.baseUrl}/GoalTracker/getTask/${taskId}`;
    

    return this.http.get<TaskResponse>(url).pipe(
      map(response => this.transformTaskResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar una tarea existente
   */
  updateTask(taskId: number, taskData: any): Observable<TaskResponse> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/updateTask/${taskId}`;

    const requestBody: TaskRequest = {
      taskId: taskId,
      taskName: taskData.taskName.trim(),
      description: taskData.description?.trim() || '',
      frequency: taskData.frequency,
      createdDate: taskData.createdDate || new Date().toISOString(),
      startDate: this.formatToISOString(taskData.startDate),
      dueDate: this.formatToISOString(taskData.dueDate),
      isCompleted: taskData.isCompleted || false,
      userId: user.userId
    };

    return this.http.put<any>(url, requestBody).pipe(
      catchError(this.handleError)
    );
  }

/**
 * Marcar tarea como completada/no completada
 */
toggleTaskCompletion(taskId: number, currentStatus: boolean): Observable<TaskResponse> {
  const user = this.authService.loggedUser();
  if (!user) {
    return throwError(() => new Error('User not authenticated'));
  }

  const url = `${this.baseUrl}/GoalTracker/updateTask/${taskId}`;

  // Primero obtener la tarea actual para mantener los datos existentes
  return this.getTaskById(taskId).pipe(
    switchMap(task => {
      const requestBody: TaskRequest = {
        taskId: taskId,
        taskName: task.taskName,
        description: task.description || '',
        frequency: task.frequency,
        createdDate: task.createdDate,
        startDate: task.startDate,
        dueDate: task.dueDate,
        isCompleted: !currentStatus, // Invertir el estado actual
        userId: user.userId
      };

      return this.http.put<any>(url, requestBody).pipe(
        catchError(this.handleError)
      );
    }),
    catchError(this.handleError)
  );
}

  /**
   * Eliminar una tarea
   */
  deleteTask(taskId: number): Observable<any> {
    const url = `${this.baseUrl}/GoalTracker/deleteTask/${taskId}`;
    

    return this.http.delete(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Formatear fecha al formato ISO
   */
  private formatToISOString(date: string | Date): string {
    if (!date) {
      return new Date().toISOString();
    }

    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.warn('Fecha inválida:', date);
        return new Date().toISOString();
      }
      return d.toISOString();
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Transformar respuesta de la API con campos calculados
   */
  private transformTaskResponse(task: any): TaskResponse {
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

  /**
   * Manejo de errores
   */
  private handleError(error: any) {
    console.error('❌ Error en TaskService:', error);
    
    let errorMessage = 'Error connecting to the server';
    let serverError = null;

    if (error.error) {
      try {
        serverError = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
      } catch (e) {
        serverError = error.error;
      }
    }
    
    if (error.status === 400) {
      errorMessage = 'Error de validación: Los datos enviados no son correctos';
    } else if (error.status === 0) {
      errorMessage = 'Error de red: No se puede conectar al servidor';
    } else if (error.status === 401) {
      errorMessage = 'No autorizado: Por favor, inicia sesión de nuevo';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status === 500) {
      errorMessage = 'Error interno del servidor';
    }
    
    return throwError(() => ({
      message: errorMessage,
      status: error.status,
      serverError: serverError,
      originalError: error
    }));
  }
}