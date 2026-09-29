import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../core/config/api.config';
import { toApiDate } from '../shared/utils/date';
import { ReminderInput, ReminderRequest, ReminderResponse, ReminderStats } from '../model/reminder';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  /**
   * Crear un nuevo reminder
   */
  createReminder(reminderData: ReminderInput): Observable<ReminderResponse> {
    return this.authService.withUser(user => {
      const requestBody: ReminderRequest = {
        reminderId: 0,
        title: reminderData.title.trim(),
        description: reminderData.description?.trim() || '',
        reminderDateTime: toApiDate(reminderData.reminderDateTime),
        isAcknowledged: false,
        userId: user.userId
      };

      return this.http
        .post<ReminderResponse>(`${this.apiUrl}/createReminder`, requestBody)
        .pipe(map(response => this.transformReminderResponse(response)));
    });
  }

  /**
   * Obtener todos los reminders de un usuario
   */
  getAllRemindersByUser(): Observable<ReminderResponse[]> {
    return this.authService.withUser(user =>
      this.http
        .get<ReminderResponse[]>(`${this.apiUrl}/getReminders`, { params: { userId: user.userId } })
        .pipe(map(reminders => reminders.map(reminder => this.transformReminderResponse(reminder))))
    );
  }

  /**
   * Obtener un reminder específico por ID
   */
  getReminderById(reminderId: number): Observable<ReminderResponse> {
    return this.http
      .get<ReminderResponse>(`${this.apiUrl}/getReminder/${reminderId}`)
      .pipe(map(response => this.transformReminderResponse(response)));
  }

  /**
   * Actualizar un reminder existente
   */
  updateReminder(reminderId: number, reminderData: ReminderInput): Observable<unknown> {
    return this.authService.withUser(user => {
      const requestBody: ReminderRequest = {
        reminderId: reminderId,
        title: reminderData.title.trim(),
        description: reminderData.description?.trim() || '',
        reminderDateTime: toApiDate(reminderData.reminderDateTime),
        isAcknowledged: reminderData.isAcknowledged || false,
        userId: user.userId
      };

      return this.http.put(`${this.apiUrl}/updateReminder/${reminderId}`, requestBody);
    });
  }

  /**
   * Marcar reminder como acknowledge/no acknowledge
   */
  toggleReminderAcknowledgement(reminder: ReminderResponse): Observable<unknown> {
    return this.updateReminder(reminder.reminderId, { ...reminder, isAcknowledged: !reminder.isAcknowledged });
  }

  /**
   * Eliminar un reminder
   */
  deleteReminder(reminderId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/deleteReminder/${reminderId}`);
  }

  /**
   * Transformar respuesta de la API con campos calculados
   */
  private transformReminderResponse(reminder: ReminderResponse): ReminderResponse {
    const now = new Date();
    const reminderDate = new Date(reminder.reminderDateTime);
    
    // Calcular tiempo restante
    const diffTime = reminderDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeRemaining = '';
    if (diffTime < 0) {
      timeRemaining = 'Overdue';
    } else if (diffHours < 24) {
      if (diffHours < 1) {
        timeRemaining = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      } else {
        timeRemaining = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      }
    } else {
      const diffDays = Math.floor(diffHours / 24);
      timeRemaining = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    // Verificar si es hoy, mañana, etc.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const reminderDateOnly = new Date(reminderDate);
    reminderDateOnly.setHours(0, 0, 0, 0);

    const isToday = reminderDateOnly.getTime() === today.getTime();
    const isTomorrow = reminderDateOnly.getTime() === tomorrow.getTime();
    const isOverdue = reminderDate < now && !reminder.isAcknowledged;

    // Formatear fecha y hora para mostrar
    const formattedDateTime = reminderDate.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      reminderId: reminder.reminderId,
      title: reminder.title,
      description: reminder.description || '',
      reminderDateTime: reminder.reminderDateTime,
      isAcknowledged: reminder.isAcknowledged,
      userId: reminder.userId,
      // Campos calculados
      timeRemaining,
      isOverdue,
      isToday,
      isTomorrow,
      formattedDateTime
    };
  }

  /**
   * Obtener estadísticas de reminders
   */
  getReminderStats(reminders: ReminderResponse[]): ReminderStats {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      total: reminders.length,
      acknowledged: reminders.filter(r => r.isAcknowledged).length,
      pending: reminders.filter(r => !r.isAcknowledged && !r.isOverdue).length,
      overdue: reminders.filter(r => !r.isAcknowledged && r.isOverdue).length,
      today: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === today.getTime() && !r.isAcknowledged;
      }).length,
      tomorrow: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === tomorrow.getTime() && !r.isAcknowledged;
      }).length,
      thisWeek: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        return rDate >= today && rDate <= nextWeek && !r.isAcknowledged;
      }).length
    };
  }
}
