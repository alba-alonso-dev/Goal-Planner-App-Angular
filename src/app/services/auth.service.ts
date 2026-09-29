// auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { LoginData, RegisterData, User } from '../model/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'https://api.freeprojectapi.com/api/GoalTracker';
  
  // Señal que almacena el usuario logueado (null si no lo está)
  loggedUser = signal<User | null>(null);

  constructor(private http: HttpClient) {
    // Al iniciar, recuperar usuario del localStorage (solo si existe)
    this.loggedUser.set(this.readStoredUser());
  }

  // Un valor corrupto o un storage no disponible no debe romper el arranque de la app
  private readStoredUser(): User | null {
    try {
      const savedUser = localStorage.getItem('user');
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
      localStorage.removeItem('user');
    } catch {
      // Storage no disponible
    }
    return null;
  }

  login(credentials: LoginData) {
    return this.http.post<User>(`${this.baseUrl}/login`, credentials) // Sin withCredentials
      .pipe(
        tap(user => {
          const { password, ...safeUser } = user as any;
          this.loggedUser.set(safeUser);
          localStorage.setItem('user', JSON.stringify(safeUser));
        })
      );
  }

  register(data: RegisterData) {
    return this.http.post<User>(`${this.baseUrl}/register`, data) // Sin withCredentials
      .pipe(
        tap(user => {
          const { password, ...safeUser } = user as any;
          this.loggedUser.set(safeUser);
          localStorage.setItem('user', JSON.stringify(safeUser));
        })
      );
  }

  logout() {
    // Opcional: llamar a un endpoint de logout si existe
    // this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe();
    this.loggedUser.set(null);
    localStorage.removeItem('user');
  }
}