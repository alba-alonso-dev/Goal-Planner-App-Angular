import { DestroyRef, Injectable, inject, signal } from '@angular/core';

const TICK_MS = 60_000;

/**
 * Hora actual como signal. Los campos derivados (vencido, días restantes, "hoy"...) dependen de ella,
 * así que se recalculan solos cada minuto en lugar de quedarse congelados desde la última carga.
 * En tests se sustituye por un reloj fijo.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly _now = signal(new Date());
  readonly now = this._now.asReadonly();

  constructor() {
    const id = setInterval(() => this._now.set(new Date()), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
