import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClockService } from '../../../core/time/clock.service';
import { EntityCollection } from '../../../shared/data-access/entity-collection';
import { goalStats, resolveAchieved, toGoalView } from '../domain/goal.rules';
import { GoalInput, GoalResponse } from '../goal.model';
import { GoalApi } from './goal.api';

/**
 * Fuente única de verdad de los goals del usuario. Las pantallas leen de aquí y las mutaciones
 * actualizan solo el goal afectado (sin recargar la lista).
 */
@Injectable({ providedIn: 'root' })
export class GoalStore {
  private api = inject(GoalApi);
  private auth = inject(AuthService);
  private clock = inject(ClockService);

  private collection = new EntityCollection<GoalResponse, 'goalId'>(
    'goalId',
    computed(() => this.auth.loggedUser()?.userId ?? null)
  );

  /** Goals con sus campos derivados, recalculados cuando cambian los datos o la hora. */
  readonly goals = computed(() => this.collection.items().map(goal => toGoalView(goal, this.clock.now())));
  readonly stats = computed(() => goalStats(this.goals()));
  readonly loading = this.collection.loading;
  readonly error = this.collection.error;

  load(options: { force?: boolean } = {}): void {
    this.collection.load(this.api.getAll(), options);
  }

  /** Entidad tal como está en el store (misma referencia mientras no cambie). */
  find(goalId: number): GoalResponse | undefined {
    return this.collection.find(goalId);
  }

  create(input: GoalInput): Observable<GoalResponse> {
    return this.collection.afterSuccess(this.api.create(input), created => this.collection.upsert(created));
  }

  /** Aplica el goal que devuelve el servidor (incluye los ids asignados a los milestones nuevos). */
  update(goalId: number, input: GoalInput): Observable<GoalResponse> {
    return this.collection.afterSuccess(this.api.update(goalId, input), updated => this.collection.upsert(updated));
  }

  /** Optimista: marca/desmarca un milestone (y recalcula si el goal está conseguido); se revierte si falla. */
  toggleMilestone(goalId: number, milestoneId: number): Observable<void> {
    const goal = this.find(goalId);
    const milestones = (goal?.milestones ?? []).map(m =>
      m.milestoneId === milestoneId ? { ...m, isCompleted: !m.isCompleted } : m
    );
    const next = goal && { ...goal, milestones, isAchieved: resolveAchieved(milestones, goal.isAchieved) };
    return this.collection.optimisticUpdate(goalId, () => next!, this.api.update(goalId, next!));
  }
}
