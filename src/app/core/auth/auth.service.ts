import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { LoginData, RegisterData, User } from './user.model';
import { API_BASE_URL } from '../config/api.config';
import { currentLocale } from '../../shared/utils/locale';

/**
 * Sesión del usuario. El token vive en una cookie HttpOnly que gestiona el backend: el navegador la
 * envía sola y JavaScript no puede leerla. Aquí solo se guarda el perfil, y nunca en localStorage:
 * al arrancar se pregunta al servidor quién es el usuario (`restoreSession`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_BASE_URL);

  private readonly _loggedUser = signal<User | null>(null);
  readonly loggedUser = this._loggedUser.asReadonly();

  /** Recupera la sesión de la cookie (si la hay). Nunca falla: sin sesión deja el usuario a null. */
  restoreSession(): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      catchError(() => of(null)),
      tap(user => this._loggedUser.set(user))
    );
  }

  login(credentials: LoginData): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/login`, credentials).pipe(tap(user => this._loggedUser.set(user)));
  }

  /** El backend abre la sesión al registrar: no hace falta un login posterior. */
  register(data: RegisterData): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, data).pipe(tap(user => this._loggedUser.set(user)));
  }

  /** Borra la cookie en el servidor y la sesión local (esta última aunque la petición falle). */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      finalize(() => this.clearSession())
    );
  }

  /** Cambia la contraseña. El servidor cierra las demás sesiones y renueva la de este dispositivo. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, { currentPassword, newPassword });
  }

  /** Pide el email de recuperación, en el idioma de la interfaz. Responde igual exista o no la cuenta. */
  requestPasswordReset(emailId: string): Observable<void> {
    const locale = currentLocale().startsWith('es') ? 'es' : 'en';
    return this.http.post<void>(`${this.apiUrl}/auth/forgot-password`, { emailId, locale });
  }

  /** Restablece la contraseña con el token del email. Todas las sesiones quedan cerradas. */
  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  /** Olvida la sesión local sin llamar al servidor (p. ej. cuando éste ya respondió 401). */
  clearSession(): void {
    this._loggedUser.set(null);
  }
}
