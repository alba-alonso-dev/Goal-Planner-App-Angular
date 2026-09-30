import { DestroyRef, Injectable, inject, signal } from '@angular/core';

const MINUTE_MS = 60_000;

/**
 * Hora actual como signal. Los campos derivados (vencido, días restantes, "hoy"...) dependen de ella,
 * así que se recalculan solos en lugar de quedarse congelados desde la última carga.
 *
 * El tic está alineado con el inicio de cada minuto (hh:mm:00): los recordatorios se fijan al minuto,
 * así que sus avisos llegan puntuales. En tests se sustituye por un reloj fijo.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly _now = signal(new Date());
  readonly now = this._now.asReadonly();

  constructor() {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextTick = () => {
      const delay = MINUTE_MS - (Date.now() % MINUTE_MS);
      timer = setTimeout(() => {
        this._now.set(new Date());
        scheduleNextTick();
      }, delay);
    };
    scheduleNextTick();
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
