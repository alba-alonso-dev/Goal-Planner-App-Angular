import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base de la API GoalTracker. Se puede sobrescribir en tests o por entorno. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl
});
