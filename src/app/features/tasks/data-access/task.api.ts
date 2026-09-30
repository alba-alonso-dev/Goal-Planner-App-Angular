import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDay } from '../../../shared/utils/date';
import { TaskInput, TaskResponse } from '../task.model';

/**
 * Acceso HTTP a /api/tasks. Sin estado ni reglas de negocio (eso vive en TaskStore y en domain/).
 * El usuario lo determina el backend a partir de la cookie de sesión: nunca se envía un userId.
 */
@Injectable({ providedIn: 'root' })
export class TaskApi {
  private http = inject(HttpClient);
  private url = `${inject(API_BASE_URL)}/tasks`;

  getAll(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(this.url);
  }

  getById(taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.url}/${taskId}`);
  }

  create(input: TaskInput): Observable<TaskResponse> {
    return defer(() => this.http.post<TaskResponse>(this.url, this.toBody(input)));
  }

  update(taskId: number, input: TaskInput): Observable<TaskResponse> {
    return defer(() => this.http.put<TaskResponse>(`${this.url}/${taskId}`, this.toBody(input)));
  }

  delete(taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${taskId}`);
  }

  /** Cuerpo que espera la API. Lanza si alguna fecha no es válida (se emite como error del observable). */
  toBody(input: TaskInput) {
    return {
      taskName: input.taskName.trim(),
      description: input.description?.trim() || '',
      frequency: input.frequency,
      startDate: toApiDay(input.startDate),
      dueDate: toApiDay(input.dueDate),
      isCompleted: input.isCompleted ?? false
    };
  }
}
