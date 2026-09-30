import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDay } from '../../../shared/utils/date';
import { resolveAchieved } from '../domain/goal.rules';
import { GoalInput, GoalResponse } from '../goal.model';

/**
 * Acceso HTTP a /api/goals. Sin estado (eso vive en GoalStore).
 * El usuario lo determina el backend a partir de la cookie de sesión.
 */
@Injectable({ providedIn: 'root' })
export class GoalApi {
  private http = inject(HttpClient);
  private url = `${inject(API_BASE_URL)}/goals`;

  /** Listado del usuario, con los milestones de cada goal. */
  getAll(): Observable<GoalResponse[]> {
    return this.http.get<GoalResponse[]>(this.url);
  }

  getById(goalId: number): Observable<GoalResponse> {
    return this.http.get<GoalResponse>(`${this.url}/${goalId}`);
  }

  create(input: GoalInput): Observable<GoalResponse> {
    return defer(() => this.http.post<GoalResponse>(this.url, this.toBody(input)));
  }

  /** Reemplaza el goal y su lista de milestones; devuelve el goal con los ids que asigna el servidor. */
  update(goalId: number, input: GoalInput): Observable<GoalResponse> {
    return defer(() => this.http.put<GoalResponse>(`${this.url}/${goalId}`, this.toBody(input)));
  }

  /** Borra el goal y sus milestones. */
  delete(goalId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${goalId}`);
  }

  /** Cuerpo que espera la API. Lanza si alguna fecha no es válida (se emite como error del observable). */
  toBody(input: GoalInput) {
    const milestones = (input.milestones ?? []).map(m => ({
      milestoneId: m.milestoneId || 0, // 0 para los nuevos
      milestoneName: m.milestoneName?.trim() || '',
      description: m.description?.trim() || '',
      targetDate: toApiDay(m.targetDate),
      isCompleted: m.isCompleted ?? false
    }));

    return {
      goalName: input.goalName.trim(),
      description: input.description?.trim() || '',
      startDate: toApiDay(input.startDate),
      endDate: toApiDay(input.endDate),
      // El backend aplica la misma regla; se envía ya resuelta para que la UI optimista coincida
      isAchieved: resolveAchieved(milestones, input.isAchieved ?? false),
      milestones
    };
  }
}
