import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDate } from '../../../shared/utils/date';
import { ReminderInput, ReminderRequest, ReminderResponse } from '../reminder.model';

/** Acceso HTTP a los recordatorios. Sin estado ni reglas de negocio: eso vive en ReminderStore y en domain/. */
@Injectable({ providedIn: 'root' })
export class ReminderApi {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  getAll(): Observable<ReminderResponse[]> {
    return this.authService.withUser(user =>
      this.http.get<ReminderResponse[]>(`${this.apiUrl}/getReminders`, { params: { userId: user.userId } })
    );
  }

  getById(reminderId: number): Observable<ReminderResponse> {
    return this.http.get<ReminderResponse>(`${this.apiUrl}/getReminder/${reminderId}`);
  }

  create(input: ReminderInput): Observable<ReminderResponse> {
    return this.authService.withUser(user =>
      this.http.post<ReminderResponse>(`${this.apiUrl}/createReminder`, this.toRequest(0, input, user.userId))
    );
  }

  update(reminderId: number, input: ReminderInput): Observable<unknown> {
    return this.authService.withUser(user =>
      this.http.put(`${this.apiUrl}/updateReminder/${reminderId}`, this.toRequest(reminderId, input, user.userId))
    );
  }

  delete(reminderId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/deleteReminder/${reminderId}`);
  }

  /** Cuerpo que espera la API. Lanza si la fecha no es válida (se emite como error del observable). */
  toRequest(reminderId: number, input: ReminderInput, userId: number): ReminderRequest {
    return {
      reminderId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      reminderDateTime: toApiDate(input.reminderDateTime),
      isAcknowledged: input.isAcknowledged ?? false,
      userId
    };
  }
}
