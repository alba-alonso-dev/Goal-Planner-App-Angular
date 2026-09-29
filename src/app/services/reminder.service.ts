import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ReminderRequest, ReminderResponse, ReminderStats } from '../model/reminder';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private baseUrl = 'https://api.freeprojectapi.com/api';

  /**
   * Crear un nuevo reminder
   */
  createReminder(reminderData: any): Observable<ReminderResponse> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/createReminder`;

    const requestBody: ReminderRequest = {
      reminderId: 0,
      title: reminderData.title.trim(),
      description: reminderData.description?.trim() || '',
      reminderDateTime: this.formatToISOString(reminderData.reminderDateTime),
      isAcknowledged: false,
      userId: user.userId
    };

    return this.http.post<ReminderResponse>(url, requestBody).pipe(
      map(response => this.transformReminderResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener todos los reminders de un usuario
   */
  getAllRemindersByUser(): Observable<ReminderResponse[]> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/getReminders`;
    

    return this.http.get<any[]>(url, { 
      params: { userId: user.userId.toString() } 
    }).pipe(
      map(reminders => reminders.map(reminder => this.transformReminderResponse(reminder))),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener un reminder específico por ID
   */
  getReminderById(reminderId: number): Observable<ReminderResponse> {
    const url = `${this.baseUrl}/GoalTracker/getReminder/${reminderId}`;
    

    return this.http.get<ReminderResponse>(url).pipe(
      map(response => this.transformReminderResponse(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar un reminder existente
   */
  updateReminder(reminderId: number, reminderData: any): Observable<ReminderResponse> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/updateReminder/${reminderId}`;

    const requestBody: ReminderRequest = {
      reminderId: reminderId,
      title: reminderData.title.trim(),
      description: reminderData.description?.trim() || '',
      reminderDateTime: this.formatToISOString(reminderData.reminderDateTime),
      isAcknowledged: reminderData.isAcknowledged || false,
      userId: user.userId
    };

    return this.http.put<any>(url, requestBody).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Marcar reminder como acknowledge/no acknowledge
   */
  toggleReminderAcknowledgement(reminder: ReminderResponse): Observable<ReminderResponse> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/updateReminder/${reminder.reminderId}`;

    const requestBody: ReminderRequest = {
      reminderId: reminder.reminderId,
      title: reminder.title,
      description: reminder.description || '',
      reminderDateTime: reminder.reminderDateTime,
      isAcknowledged: !reminder.isAcknowledged,
      userId: user.userId
    };

    return this.http.put<any>(url, requestBody).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar un reminder
   */
  deleteReminder(reminderId: number): Observable<any> {
    const url = `${this.baseUrl}/GoalTracker/deleteReminder/${reminderId}`;
    

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
  private transformReminderResponse(reminder: any): ReminderResponse {
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

  /**
   * Manejo de errores
   */
  private handleError(error: any) {
    console.error('❌ Error en ReminderService:', error);
    
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