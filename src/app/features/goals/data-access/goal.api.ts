import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDate } from '../../../shared/utils/date';
import { resolveAchieved } from '../domain/goal.rules';
import { GoalInput, GoalRequest, GoalResponse } from '../goal.model';

/** Acceso HTTP a los goals. Sin estado: eso vive en GoalStore. */
@Injectable({ providedIn: 'root' })
export class GoalApi {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  /** Listado del usuario. La API no incluye los milestones en el listado. */
  getAll(): Observable<GoalResponse[]> {
    return this.authService.withUser(user =>
      this.http.get<GoalResponse[]>(`${this.apiUrl}/getAllGoalsByUser`, { params: { userId: user.userId } })
    );
  }

  /** Detalle de un goal, con sus milestones. */
  getById(goalId: number): Observable<GoalResponse> {
    return this.http.get<GoalResponse>(`${this.apiUrl}/getGoal/${goalId}`);
  }

  create(input: GoalInput): Observable<unknown> {
    return this.authService.withUser(user =>
      this.http.post(`${this.apiUrl}/createGoalWithMilestones`, this.toRequest(0, input, user.userId))
    );
  }

  update(goalId: number, input: GoalInput): Observable<unknown> {
    return this.authService.withUser(user =>
      this.http.put(`${this.apiUrl}/updateGoalWithMilestones/${goalId}`, this.toRequest(goalId, input, user.userId))
    );
  }

  /** Cuerpo que espera la API. Lanza si alguna fecha no es válida (se emite como error del observable). */
  toRequest(goalId: number, input: GoalInput, userId: number): GoalRequest {
    const milestones = (input.milestones ?? []).map(m => ({
      milestoneId: m.milestoneId || 0, // 0 para los nuevos
      milestoneName: m.milestoneName?.trim() || '',
      description: m.description?.trim() || '',
      targetDate: toApiDate(m.targetDate),
      isCompleted: m.isCompleted ?? false
    }));

    return {
      goalId,
      goalName: input.goalName.trim(),
      description: input.description?.trim() || '',
      startDate: toApiDate(input.startDate),
      endDate: toApiDate(input.endDate),
      isAchieved: resolveAchieved(milestones, input.isAchieved ?? false),
      userId,
      milestones
    };
  }
}
