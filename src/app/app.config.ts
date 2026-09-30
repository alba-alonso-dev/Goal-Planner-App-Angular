import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { errorInterceptor } from './core/http/error.interceptor';
import { PushService } from './core/notifications/push.service';
import { ReminderAlertsService } from './features/reminders/data-access/reminder-alerts.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Sin zone.js: la detección de cambios la disparan signals, eventos de plantilla y async pipe
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
    // Antes de la primera navegación se sabe si hay sesión, así el guard decide con datos reales
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    // Avisos de recordatorios en cualquier página mientras la app está abierta
    provideEnvironmentInitializer(() => inject(ReminderAlertsService)),
    // Resincroniza la suscripción push de este navegador al recuperar la sesión
    provideEnvironmentInitializer(() => inject(PushService))
  ]
};
