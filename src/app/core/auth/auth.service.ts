// auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, tap, throwError } from 'rxjs';
import { LoginData, RegisterData, User } from './user.model';
import { API_BASE_URL } from '../config/api.config';
import { ApiError } from '../http/api-error';

const STORAGE_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = inject(API_BASE_URL);

  // Señal que almacena el usuario logueado (null si no lo está)
  private readonly _loggedUser = signal<User | null>(this.readStoredUser());
  readonly loggedUser = this._loggedUser.asReadonly();

  login(credentials: LoginData) {
    return this.http.post<User>(`${this.apiUrl}/login`, credentials).pipe(tap(user => this.setSession(user)));
  }

  register(data: RegisterData) {
    return this.http.post<User>(`${this.apiUrl}/register`, data).pipe(tap(user => this.setSession(user)));
  }

  logout() {
    this._loggedUser.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage no disponible
    }
  }

  /**
   * Ejecuta `request` con el usuario autenticado, o emite un `ApiError` 401 si no hay sesión.
   * Cualquier excepción síncrona al construir la petición se emite como error del observable.
   */
  withUser<T>(request: (user: User) => Observable<T>): Observable<T> {
    return defer(() => {
      const user = this._loggedUser();
      return user ? request(user) : throwError(() => new ApiError(401, 'User not authenticated'));
    });
  }

  private setSession(user: User) {
    // Nunca persistir la contraseña aunque la API la devuelva
    const { password: _password, ...safeUser } = user as User & { password?: string };
    this._loggedUser.set(safeUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    } catch {
      // Storage no disponible: la sesión dura lo que la pestaña
    }
  }

  // Un valor corrupto o un storage no disponible no debe romper el arranque de la app
  private readStoredUser(): User | null {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (!savedUser) {
        return null;
      }
      const parsed = JSON.parse(savedUser);
      if (parsed && typeof parsed.userId === 'number') {
        return parsed as User;
      }
    } catch {
      // Ignorado: se trata como sesión inexistente
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage no disponible
    }
    return null;
  }
}
