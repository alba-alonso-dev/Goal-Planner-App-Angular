import { Signal, computed, effect, signal, untracked } from '@angular/core';
import { Observable, catchError, defer, map, tap, throwError } from 'rxjs';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Estado de una colección de entidades con signals: carga con caché, reset y cambios locales
 * (incluidos los optimistas, que se revierten si la petición falla). Lo usan los stores de cada feature.
 *
 * Debe crearse en un contexto de inyección (p. ej. como campo de un servicio) porque registra un effect.
 */
export class EntityCollection<T, K extends keyof T> {
  private readonly _items = signal<readonly T[]>([]);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);
  /** Se incrementa en cada reset: las respuestas de peticiones anteriores se descartan. */
  private generation = 0;

  readonly items = this._items.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loading = computed(() => this._status() === 'loading');

  /**
   * @param key propiedad que identifica cada entidad
   * @param owner la colección se vacía cuando cambia este valor (p. ej. el usuario autenticado)
   */
  constructor(
    private readonly key: K,
    owner: Signal<unknown>
  ) {
    let currentOwner = untracked(owner);
    effect(() => {
      const next = owner();
      if (next !== currentOwner) {
        currentOwner = next;
        untracked(() => this.reset());
      }
    });
  }

  /** Carga la colección. Si ya está cargada o cargándose no hace nada, salvo con `force`. */
  load(source: Observable<T[]>, options: { force?: boolean } = {}): void {
    const status = this._status();
    if (!options.force && (status === 'loading' || status === 'loaded')) return;

    const generation = this.generation;
    this._status.set('loading');
    this._error.set(null);

    source.subscribe({
      next: items => {
        if (generation !== this.generation) return;
        this._items.set(items);
        this._status.set('loaded');
      },
      error: (error: Error) => {
        if (generation !== this.generation) return;
        this._error.set(error.message || $localize`Error loading data`);
        this._status.set('error');
      }
    });
  }

  reset(): void {
    this.generation++;
    this._items.set([]);
    this._status.set('idle');
    this._error.set(null);
  }

  find(id: T[K]): T | undefined {
    return this._items().find(item => item[this.key] === id);
  }

  /** Sustituye la entidad con la misma clave o la añade al final. */
  upsert(item: T): void {
    this._items.update(items =>
      items.some(i => i[this.key] === item[this.key])
        ? items.map(i => (i[this.key] === item[this.key] ? item : i))
        : [...items, item]
    );
  }

  /** Ejecuta `request` y, si va bien, aplica `apply` a la colección (solo si no ha habido un reset entretanto). */
  afterSuccess<R>(request: Observable<R>, apply: (result: R) => void): Observable<R> {
    return defer(() => {
      const generation = this.generation;
      return request.pipe(
        tap(result => {
          if (generation === this.generation) apply(result);
        })
      );
    });
  }

  /** Aplica `changes` a una entidad al momento y la restaura si `request` falla. */
  optimisticUpdate(id: T[K], changes: (item: T) => T, request: Observable<unknown>): Observable<void> {
    return defer(() => {
      const previous = this.find(id);
      if (!previous) return throwError(() => new Error('Entity not found'));
      const generation = this.generation;
      this.upsert(changes(previous));

      return request.pipe(
        map(() => undefined),
        catchError(error => {
          // Restaura solo esta entidad, sin deshacer otros cambios hechos mientras tanto
          if (generation === this.generation && this.find(id)) this.upsert(previous);
          return throwError(() => error);
        })
      );
    });
  }

  /** Quita una entidad al momento y la vuelve a insertar en su posición si `request` falla. */
  optimisticRemove(id: T[K], request: Observable<unknown>): Observable<void> {
    return defer(() => {
      const index = this._items().findIndex(item => item[this.key] === id);
      if (index === -1) return throwError(() => new Error('Entity not found'));
      const removed = this._items()[index];
      const generation = this.generation;
      this._items.update(items => items.filter(item => item[this.key] !== id));

      return request.pipe(
        map(() => undefined),
        catchError(error => {
          if (generation === this.generation && !this.find(id)) {
            this._items.update(items => [...items.slice(0, index), removed, ...items.slice(index)]);
          }
          return throwError(() => error);
        })
      );
    });
  }
}
