import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';
import { currentLocale } from '../../shared/utils/locale';
import { BROWSER_PUSH } from './browser-push';

/**
 * - `unsupported`: el navegador no tiene Web Push (o la página no es segura).
 * - `unavailable`: el servidor no tiene Web Push configurado.
 * - `denied`: el usuario bloqueó las notificaciones para este sitio.
 * - `off` / `on`: se puede activar / está activado en este navegador.
 */
export type PushState = 'checking' | 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

/** Usuario que activó el push en este navegador (para no heredar la suscripción de otra persona). */
const OWNER_KEY = 'gp_push_owner';

/**
 * Notificaciones push de recordatorios: llegan aunque la aplicación esté cerrada. La suscripción es
 * de este navegador y se asocia al usuario en el servidor; al cerrar sesión se elimina.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private browser = inject(BROWSER_PUSH);
  private url = `${inject(API_BASE_URL)}/push`;

  private readonly _state = signal<PushState>('checking');
  readonly state = this._state.asReadonly();
  readonly busy = signal(false);

  private publicKey?: Promise<string | null>;

  constructor() {
    effect(() => {
      const user = this.auth.loggedUser();
      untracked(() => void this.refresh(user?.userId ?? null));
    });
  }

  /** Pide permiso (debe llamarse desde un clic), suscribe este navegador y lo registra en el servidor. */
  async enable(): Promise<void> {
    const key = await this.serverKey();
    const user = this.auth.loggedUser();
    if (!key || !user) return;
    this.busy.set(true);
    try {
      const permission = await this.browser.requestPermission();
      if (permission !== 'granted') {
        this._state.set(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const subscription = (await this.browser.getSubscription()) ?? (await this.browser.subscribe(key));
      await this.register(subscription);
      this.browser.storage?.setItem(OWNER_KEY, String(user.userId));
      this._state.set('on');
    } finally {
      this.busy.set(false);
    }
  }

  /** Desactiva el push en este navegador (en el servidor y en el propio navegador). */
  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      await this.forgetBrowser();
      this._state.set((await this.serverKey()) ? 'off' : 'unavailable');
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Para llamar antes de cerrar sesión: si no, la siguiente persona que use este navegador
   * recibiría los recordatorios de la anterior. Nunca falla.
   */
  async forgetBrowser(): Promise<void> {
    try {
      const subscription = await this.browser.getSubscription();
      if (subscription) {
        await firstValueFrom(
          this.http.delete(`${this.url}/subscriptions`, { body: { endpoint: subscription.endpoint } })
        ).catch(() => undefined);
        await subscription.unsubscribe();
      }
    } catch {
      // Sin push o sin permiso: no hay nada que limpiar
    }
    this.browser.storage?.removeItem(OWNER_KEY);
  }

  /** Estado para el usuario actual; si ya tenía el push activo en este navegador, se resincroniza. */
  private async refresh(userId: number | null): Promise<void> {
    if (!this.browser.supported) return this._state.set('unsupported');
    if (userId === null) return this._state.set('off');
    if (!(await this.serverKey())) return this._state.set('unavailable');
    if (this.browser.permission() === 'denied') return this._state.set('denied');

    const subscription = await this.browser.getSubscription();
    if (!subscription) return this._state.set('off');

    // Suscripción heredada de otra persona (p. ej. su sesión caducó sin cerrar sesión): se elimina
    if (this.browser.storage?.getItem(OWNER_KEY) !== String(userId)) {
      await subscription.unsubscribe().catch(() => undefined);
      return this._state.set('off');
    }
    try {
      await this.register(subscription);
      this._state.set('on');
    } catch {
      this._state.set('off');
    }
  }

  private register(subscription: PushSubscription): Promise<unknown> {
    const locale = currentLocale().startsWith('es') ? 'es' : 'en';
    return firstValueFrom(this.http.post(`${this.url}/subscriptions`, { ...subscription.toJSON(), locale }));
  }

  private serverKey(): Promise<string | null> {
    this.publicKey ??= firstValueFrom(this.http.get<{ publicKey: string | null }>(`${this.url}/config`))
      .then(config => config.publicKey)
      .catch(() => {
        this.publicKey = undefined; // se reintenta la próxima vez
        return null;
      });
    return this.publicKey;
  }
}
