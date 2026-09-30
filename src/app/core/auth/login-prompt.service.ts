import { Injectable, signal } from '@angular/core';

export type AuthView = 'login' | 'register' | 'forgot';

/**
 * Abre el modal de acceso (que vive en la navbar) desde cualquier parte de la app: los botones de
 * la home o la página de restablecer contraseña, por ejemplo.
 */
@Injectable({ providedIn: 'root' })
export class LoginPromptService {
  private readonly _view = signal<AuthView | null>(null);
  /** Vista con la que se abre el modal; null si está cerrado. */
  readonly view = this._view.asReadonly();

  open(view: AuthView = 'login'): void {
    this._view.set(view);
  }

  close(): void {
    this._view.set(null);
  }
}
