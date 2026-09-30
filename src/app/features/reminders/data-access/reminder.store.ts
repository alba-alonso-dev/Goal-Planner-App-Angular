import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ClockService } from '../../../core/time/clock.service';
import { EntityCollection } from '../../../shared/data-access/entity-collection';
import { reminderStats, toReminderView } from '../domain/reminder.rules';
import { ReminderInput, ReminderResponse } from '../reminder.model';
import { ReminderApi } from './reminder.api';

/**
 * Fuente única de verdad de los recordatorios del usuario. Las pantallas leen de aquí y las mutaciones
 * actualizan solo la entidad afectada (sin recargar la lista).
 */
@Injectable({ providedIn: 'root' })
export class ReminderStore {
  private api = inject(ReminderApi);
  private auth = inject(AuthService);
  private clock = inject(ClockService);

  private collection = new EntityCollection<ReminderResponse, 'reminderId'>(
    'reminderId',
    computed(() => this.auth.loggedUser()?.userId ?? null)
  );

  /** Recordatorios con sus campos derivados, recalculados cuando cambian los datos o la hora. */
  readonly reminders = computed(() =>
    this.collection.items().map(reminder => toReminderView(reminder, this.clock.now()))
  );
  readonly stats = computed(() => reminderStats(this.reminders()));
  readonly loading = this.collection.loading;
  readonly error = this.collection.error;

  load(options: { force?: boolean } = {}): void {
    this.collection.load(this.api.getAll(), options);
  }

  /** Entidad tal como está en el store (misma referencia mientras no cambie). */
  find(reminderId: number): ReminderResponse | undefined {
    return this.collection.find(reminderId);
  }

  create(input: ReminderInput): Observable<ReminderResponse> {
    return this.collection.afterSuccess(this.api.create(input), created => {
      // Si la API devuelve el recordatorio con su id se inserta; si no, se recarga la lista
      if (created?.reminderId > 0) {
        this.collection.upsert({ ...this.api.toRequest(0, input, this.userId()), ...created });
      } else {
        this.load({ force: true });
      }
    });
  }

  update(reminderId: number, input: ReminderInput): Observable<unknown> {
    return this.collection.afterSuccess(this.api.update(reminderId, input), () =>
      this.collection.upsert(this.api.toRequest(reminderId, input, this.userId()))
    );
  }

  /** Optimista: cambia al momento y se revierte si la API falla. */
  toggleAcknowledgement(reminderId: number): Observable<void> {
    const reminder = this.find(reminderId);
    const next = reminder && { ...reminder, isAcknowledged: !reminder.isAcknowledged };
    return this.collection.optimisticUpdate(reminderId, () => next!, this.api.update(reminderId, next!));
  }

  /** Optimista: desaparece al momento y vuelve a su sitio si la API falla. */
  delete(reminderId: number): Observable<void> {
    return this.collection.optimisticRemove(reminderId, this.api.delete(reminderId));
  }

  private userId(): number {
    return this.auth.loggedUser()?.userId ?? 0;
  }
}
