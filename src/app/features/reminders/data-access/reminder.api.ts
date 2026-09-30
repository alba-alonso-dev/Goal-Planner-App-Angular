import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDate } from '../../../shared/utils/date';
import { ReminderInput, ReminderResponse } from '../reminder.model';

/**
 * Acceso HTTP a /api/reminders. Sin estado ni reglas de negocio (eso vive en ReminderStore y en domain/).
 * El usuario lo determina el backend a partir de la cookie de sesión.
 */
@Injectable({ providedIn: 'root' })
export class ReminderApi {
  private http = inject(HttpClient);
  private url = `${inject(API_BASE_URL)}/reminders`;

  getAll(): Observable<ReminderResponse[]> {
    return this.http.get<ReminderResponse[]>(this.url);
  }

  getById(reminderId: number): Observable<ReminderResponse> {
    return this.http.get<ReminderResponse>(`${this.url}/${reminderId}`);
  }

  create(input: ReminderInput): Observable<ReminderResponse> {
    return defer(() => this.http.post<ReminderResponse>(this.url, this.toBody(input)));
  }

  update(reminderId: number, input: ReminderInput): Observable<ReminderResponse> {
    return defer(() => this.http.put<ReminderResponse>(`${this.url}/${reminderId}`, this.toBody(input)));
  }

  delete(reminderId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${reminderId}`);
  }

  /** Cuerpo que espera la API: el instante en ISO 8601 (UTC). Lanza si la fecha no es válida. */
  toBody(input: ReminderInput) {
    return {
      title: input.title.trim(),
      description: input.description?.trim() || '',
      reminderDateTime: toApiDate(input.reminderDateTime),
      isAcknowledged: input.isAcknowledged ?? false
    };
  }
}
