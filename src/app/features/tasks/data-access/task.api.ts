import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDate } from '../../../shared/utils/date';
import { TaskInput, TaskRequest, TaskResponse } from '../task.model';

/** Acceso HTTP a las tareas. Sin estado ni reglas de negocio: eso vive en TaskStore y en domain/. */
@Injectable({ providedIn: 'root' })
export class TaskApi {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  getAll(): Observable<TaskResponse[]> {
    return this.authService.withUser(user =>
      this.http.get<TaskResponse[]>(`${this.apiUrl}/getAllTasks`, { params: { userId: user.userId } })
    );
  }

  getById(taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.apiUrl}/getTask/${taskId}`);
  }

  create(input: TaskInput): Observable<TaskResponse> {
    return this.authService.withUser(user =>
      this.http.post<TaskResponse>(`${this.apiUrl}/createTask`, this.toRequest(0, input, user.userId))
    );
  }

  update(taskId: number, input: TaskInput): Observable<unknown> {
    return this.authService.withUser(user =>
      this.http.put(`${this.apiUrl}/updateTask/${taskId}`, this.toRequest(taskId, input, user.userId))
    );
  }

  delete(taskId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/deleteTask/${taskId}`);
  }

  /** Cuerpo que espera la API. Lanza si alguna fecha no es válida (se emite como error del observable). */
  toRequest(taskId: number, input: TaskInput, userId: number): TaskRequest {
    return {
      taskId,
      taskName: input.taskName.trim(),
      description: input.description?.trim() || '',
      frequency: input.frequency,
      createdDate: input.createdDate || new Date().toISOString(),
      startDate: toApiDate(input.startDate),
      dueDate: toApiDate(input.dueDate),
      isCompleted: input.isCompleted ?? false,
      userId
    };
  }
}
