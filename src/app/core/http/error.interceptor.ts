import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { toApiError } from './api-error';

/**
 * Normaliza los errores HTTP a `ApiError` y cierra la sesión si el servidor responde 401
 * estando autenticado.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401 && authService.loggedUser()) {
        authService.logout();
        router.navigate(['/home']);
      }

      return throwError(() => toApiError(error));
    })
  );
};
