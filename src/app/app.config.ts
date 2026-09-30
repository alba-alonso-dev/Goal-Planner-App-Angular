import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Sin zone.js: la detección de cambios la disparan signals, eventos de plantilla y async pipe
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
    // Antes de la primera navegación se sabe si hay sesión, así el guard decide con datos reales
    provideAppInitializer(() => inject(AuthService).restoreSession())
  ]
};
