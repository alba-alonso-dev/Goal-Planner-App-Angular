import { Injectable, computed, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClockService } from '../../../core/time/clock.service';
import { EntityCollection } from '../../../shared/data-access/entity-collection';
import { goalStats, resolveAchieved, toGoalView } from '../domain/goal.rules';
import { GoalInput, GoalResponse } from '../goal.model';
import { GoalApi } from './goal.api';

/** Con pocos goals se cargan también sus detalles (milestones) para mostrar el progreso real. */
const MAX_GOALS_WITH_DETAILS = 5;

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
    const source = this.api
      .getAll()
      .pipe(
        switchMap(goals =>
          goals.length > 0 && goals.length <= MAX_GOALS_WITH_DETAILS
            ? forkJoin(goals.map(goal => this.api.getById(goal.goalId)))
            : of(goals)
        )
      );
    this.collection.load(source, options);
  }

  /** Entidad tal como está en el store (misma referencia mientras no cambie). */
  find(goalId: number): GoalResponse | undefined {
    return this.collection.find(goalId);
  }

  /** Carga el detalle (con milestones) de un goal y lo guarda en el store. */
  loadDetails(goalId: number): Observable<GoalResponse> {
    return this.collection.afterSuccess(this.api.getById(goalId), goal => this.collection.upsert(goal));
  }

  create(input: GoalInput): Observable<unknown> {
    // La API no devuelve el goal creado: se recarga la lista
    return this.collection.afterSuccess(this.api.create(input), () => this.load({ force: true }));
  }

  /** Guarda y vuelve a pedir el detalle, para obtener los ids que asigna el servidor a los milestones nuevos. */
  update(goalId: number, input: GoalInput): Observable<GoalResponse> {
    return this.collection.afterSuccess(
      this.api.update(goalId, input).pipe(switchMap(() => this.api.getById(goalId))),
      goal => this.collection.upsert(goal)
    );
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
