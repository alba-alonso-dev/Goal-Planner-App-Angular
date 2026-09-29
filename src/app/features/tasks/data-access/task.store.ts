import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClockService } from '../../../core/time/clock.service';
import { EntityCollection } from '../../../shared/data-access/entity-collection';
import { taskStats, toTaskView } from '../domain/task.rules';
import { TaskInput, TaskResponse } from '../task.model';
import { TaskApi } from './task.api';

/**
 * Fuente única de verdad de las tareas del usuario. Las pantallas leen de aquí y las mutaciones
 * actualizan solo la entidad afectada (sin recargar la lista).
 */
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private api = inject(TaskApi);
  private auth = inject(AuthService);
  private clock = inject(ClockService);

  private collection = new EntityCollection<TaskResponse, 'taskId'>(
    'taskId',
    computed(() => this.auth.loggedUser()?.userId ?? null)
  );

  /** Tareas con sus campos derivados, recalculados cuando cambian los datos o la hora. */
  readonly tasks = computed(() => this.collection.items().map(task => toTaskView(task, this.clock.now())));
  readonly stats = computed(() => taskStats(this.tasks()));
  readonly loading = this.collection.loading;
  readonly error = this.collection.error;

  load(options: { force?: boolean } = {}): void {
    this.collection.load(this.api.getAll(), options);
  }

  /** Entidad tal como está en el store (misma referencia mientras no cambie). */
  find(taskId: number): TaskResponse | undefined {
    return this.collection.find(taskId);
  }

  create(input: TaskInput): Observable<TaskResponse> {
    return this.collection.afterSuccess(this.api.create(input), created => {
      // Si la API devuelve la tarea con su id se inserta; si no, se recarga la lista
      if (created?.taskId > 0) this.collection.upsert({ ...this.api.toRequest(0, input, this.userId()), ...created });
      else this.load({ force: true });
    });
  }

  update(taskId: number, input: TaskInput): Observable<unknown> {
    return this.collection.afterSuccess(this.api.update(taskId, input), () =>
      this.collection.upsert(this.api.toRequest(taskId, input, this.userId()))
    );
  }

  /** Optimista: la casilla cambia al momento y se revierte si la API falla. */
  toggleCompletion(taskId: number): Observable<void> {
    const task = this.find(taskId);
    const next = task && { ...task, isCompleted: !task.isCompleted };
    return this.collection.optimisticUpdate(taskId, () => next!, this.api.update(taskId, next!));
  }

  /** Optimista: desaparece al momento y vuelve a su sitio si la API falla. */
  delete(taskId: number): Observable<void> {
    return this.collection.optimisticRemove(taskId, this.api.delete(taskId));
  }

  private userId(): number {
    return this.auth.loggedUser()?.userId ?? 0;
  }
}
