import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { GoalRequest, GoalResponse, MilestoneRequest } from '../model/goal';

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  private baseUrl = 'https://api.freeprojectapi.com/api';

  constructor() { }

  /**
   * Crear un nuevo goal con sus milestones
   */
  createGoalWithMilestones(goalData: any): Observable<any> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/createGoalWithMilestones`;

    // Construir el request body según el modelo exacto que pide la API
    const requestBody: GoalRequest = {
      goalId: 0,
      goalName: goalData.goalName.trim(),
      description: goalData.description?.trim() || '',
      startDate: this.formatToISOString(goalData.startDate),
      endDate: this.formatToISOString(goalData.endDate),
      isAchieved: false,
      userId: user.userId,
      milestones: this.buildMilestones(goalData.milestones || [])
    };

    return this.http.post<any>(url, requestBody).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Construir el array de milestones en el formato correcto
   */
  private buildMilestones(milestones: any[]): MilestoneRequest[] {
    if (!milestones || milestones.length === 0) {
      return [];
    }

    return milestones.map(m => ({
      milestoneId: 0,
      milestoneName: m.milestoneName?.trim() || '',
      description: m.description?.trim() || '',
      targetDate: this.formatToISOString(m.targetDate),
      isCompleted: false
    }));
  }

  /**
   * Formatear fecha al formato ISO exacto que espera la API
   * Ejemplo: "2026-02-24T08:22:52.702Z"
   */
  private formatToISOString(date: string | Date): string {
    if (!date) {
      return new Date().toISOString();
    }

    try {
      const d = new Date(date);
      
      // Verificar si la fecha es válida
      if (isNaN(d.getTime())) {
        console.warn('Fecha inválida:', date);
        return new Date().toISOString();
      }

      // Asegurar el formato ISO completo con milisegundos
      return d.toISOString();
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return new Date().toISOString();
    }
  }

  /**
   * Obtener todos los goals de un usuario
   */
  getAllGoalsByUser(): Observable<GoalResponse[]> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/getAllGoalsByUser`;
    

    return this.http.get<any[]>(url, { 
      params: { userId: user.userId.toString() } 
    }).pipe(
      map(goals => {
        // Transformar cada goal con progreso por milestone
        const transformedGoals = goals.map(goal => this.transformGoalResponse(goal));
        
        // Si hay pocos goals (< 5), podrías cargar detalles automáticamente
        if (transformedGoals.length <= 5) {
          // Aquí podrías hacer forkJoin para cargar todos los detalles
          this.loadMilestonesForGoals(transformedGoals).subscribe();
        }
        
        return transformedGoals;
      }),
      catchError(this.handleError)
    );
  }

  // Método para cargar milestones en segundo plano
  private loadMilestonesForGoals(goals: GoalResponse[]): Observable<any> {
    const requests = goals.map(goal => 
      this.getGoalById(goal.goalId).pipe(
        map(detailedGoal => {
          goal.milestones = detailedGoal.milestones;
          goal.progress = detailedGoal.progress;
          return goal;
        })
      )
    );
    
    return forkJoin(requests);
  }

  /**
   * Obtener un goal específico por ID
   */
  getGoalById(goalId: number): Observable<GoalResponse> {
    const url = `${this.baseUrl}/GoalTracker/getGoal/${goalId}`;
    

    return this.http.get<GoalResponse>(url).pipe(
      map(response => {
        return this.transformGoalResponse(response);
      }),
      catchError(this.handleError)
    );
  }

  private transformGoalResponse(goal: any): GoalResponse {
    // Calcular progreso basado en milestones completados si existen
    let progress = 0;
    
    if (goal.milestones && goal.milestones.length > 0) {
      const completedMilestones = goal.milestones.filter((m: any) => m.isCompleted).length;
      progress = Math.round((completedMilestones / goal.milestones.length) * 100);
    } else if (goal.isAchieved) {
      progress = 100;
    }

    return {
      goalId: goal.goalId,
      goalName: goal.goalName,  // Asegurar que se mapea correctamente
      description: goal.description,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isAchieved: goal.isAchieved,
      userId: goal.userId,
      progress: progress,  // Añadir progreso calculado
      milestones: goal.milestones || []
    };
  } 

   /**
   * Verificar si todos los milestones están completados
   */
  private areAllMilestonesCompleted(milestones: any[]): boolean {
    if (!milestones || milestones.length === 0) {
      return false;
    }
    
    return milestones.every(m => m.isCompleted === true);
  }

  /**
  * Actualizar un goal existente con sus milestones
  */
  updateGoalWithMilestones(goalId: number, goalData: any): Observable<any> {
    const user = this.authService.loggedUser();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    const url = `${this.baseUrl}/GoalTracker/updateGoalWithMilestones/${goalId}`;

    // Verificar si todos los milestones están completados
    const allMilestonesCompleted = this.areAllMilestonesCompleted(goalData.milestones);
      
      // Si todos están completados, marcar el goal como achieved
    const isAchieved = allMilestonesCompleted || goalData.isAchieved || false;

    // Construir el request body según el modelo exacto que pide la API
    const requestBody: GoalRequest = {
      goalId: goalId,
      goalName: goalData.goalName.trim(),
      description: goalData.description?.trim() || '',
      startDate: this.formatToISOString(goalData.startDate),
      endDate: this.formatToISOString(goalData.endDate),
      isAchieved: isAchieved,
      userId: user.userId,
      milestones: this.buildMilestonesForUpdate(goalData.milestones || [])
    };

    return this.http.put<any>(url, requestBody).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Construir milestones para update (manteniendo IDs existentes)
   */
  private buildMilestonesForUpdate(milestones: any[]): MilestoneRequest[] {
    if (!milestones || milestones.length === 0) {
      return [];
    }

    return milestones.map(m => ({
      milestoneId: m.milestoneId || 0, // Mantener ID si existe, 0 para nuevos
      milestoneName: m.milestoneName?.trim() || '',
      description: m.description?.trim() || '',
      targetDate: this.formatToISOString(m.targetDate),
      isCompleted: m.isCompleted || false
    }));
  }

  /**
   * Manejo de errores mejorado
   */
  private handleError(error: any) {
    console.error('❌ Error completo:', error);
    
    let errorMessage = 'Error connecting to the server';
    let serverError = null;

    if (error.error) {
      try {
        // Intentar parsear el error del servidor
        serverError = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
        console.error('Detalles del error del servidor:', serverError);
      } catch (e) {
        serverError = error.error;
      }
    }
    
    if (error.status === 400) {
      errorMessage = 'Error de validación: Los datos enviados no son correctos';
      if (serverError) {
        console.error('Detalles de validación:', serverError);
      }
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