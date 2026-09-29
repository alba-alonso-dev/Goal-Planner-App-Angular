import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { toApiDate } from '../../../shared/utils/date';
import { GoalInput, GoalRequest, GoalResponse, MilestoneInput, MilestoneRequest } from '../goal.model';

/** Con pocos goals se cargan también sus detalles (milestones) para mostrar el progreso real. */
const MAX_GOALS_WITH_DETAILS = 5;

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = inject(API_BASE_URL);

  /**
   * Crear un nuevo goal con sus milestones
   */
  createGoalWithMilestones(goalData: GoalInput): Observable<unknown> {
    return this.authService.withUser(user => {
      const requestBody: GoalRequest = {
        goalId: 0,
        goalName: goalData.goalName.trim(),
        description: goalData.description?.trim() || '',
        startDate: toApiDate(goalData.startDate),
        endDate: toApiDate(goalData.endDate),
        isAchieved: false,
        userId: user.userId,
        milestones: this.buildMilestones(goalData.milestones || [])
      };

      return this.http.post(`${this.apiUrl}/createGoalWithMilestones`, requestBody);
    });
  }

  /**
   * Obtener todos los goals de un usuario.
   * Si hay pocos, se completan con sus detalles antes de emitir, para que el progreso sea correcto.
   */
  getAllGoalsByUser(): Observable<GoalResponse[]> {
    return this.authService.withUser(user =>
      this.http.get<GoalResponse[]>(`${this.apiUrl}/getAllGoalsByUser`, { params: { userId: user.userId } }).pipe(
        map(goals => goals.map(goal => this.transformGoalResponse(goal))),
        switchMap(goals =>
          goals.length > 0 && goals.length <= MAX_GOALS_WITH_DETAILS
            ? forkJoin(goals.map(goal => this.getGoalById(goal.goalId)))
            : of(goals)
        )
      )
    );
  }

  /**
   * Obtener un goal específico por ID
   */
  getGoalById(goalId: number): Observable<GoalResponse> {
    return this.http
      .get<GoalResponse>(`${this.apiUrl}/getGoal/${goalId}`)
      .pipe(map(response => this.transformGoalResponse(response)));
  }

  /**
   * Actualizar un goal existente con sus milestones
   */
  updateGoalWithMilestones(goalId: number, goalData: GoalInput): Observable<unknown> {
    return this.authService.withUser(user => {
      // Si todos los milestones están completados, marcar el goal como achieved
      const allMilestonesCompleted = this.areAllMilestonesCompleted(goalData.milestones || []);
      const isAchieved = allMilestonesCompleted || goalData.isAchieved || false;

      const requestBody: GoalRequest = {
        goalId: goalId,
        goalName: goalData.goalName.trim(),
        description: goalData.description?.trim() || '',
        startDate: toApiDate(goalData.startDate),
        endDate: toApiDate(goalData.endDate),
        isAchieved: isAchieved,
        userId: user.userId,
        milestones: this.buildMilestones(goalData.milestones || [])
      };

      return this.http.put(`${this.apiUrl}/updateGoalWithMilestones/${goalId}`, requestBody);
    });
  }

  /**
   * Construir el array de milestones en el formato de la API (0 como ID para los nuevos)
   */
  private buildMilestones(milestones: MilestoneInput[]): MilestoneRequest[] {
    return milestones.map(m => ({
      milestoneId: m.milestoneId || 0,
      milestoneName: m.milestoneName?.trim() || '',
      description: m.description?.trim() || '',
      targetDate: toApiDate(m.targetDate),
      isCompleted: m.isCompleted || false
    }));
  }

  private transformGoalResponse(goal: GoalResponse): GoalResponse {
    // Calcular progreso basado en milestones completados si existen
    let progress = 0;

    if (goal.milestones && goal.milestones.length > 0) {
      const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
      progress = Math.round((completedMilestones / goal.milestones.length) * 100);
    } else if (goal.isAchieved) {
      progress = 100;
    }

    return {
      goalId: goal.goalId,
      goalName: goal.goalName,
      description: goal.description,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isAchieved: goal.isAchieved,
      userId: goal.userId,
      progress: progress,
      milestones: goal.milestones || []
    };
  }

  /**
   * Verificar si todos los milestones están completados
   */
  private areAllMilestonesCompleted(milestones: MilestoneInput[]): boolean {
    return milestones.length > 0 && milestones.every(m => m.isCompleted === true);
  }
}
