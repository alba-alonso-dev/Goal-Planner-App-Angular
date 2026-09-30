import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LayoutComponent } from './core/layout/layout/layout.component';
import { HomeComponent } from './features/home/home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: '',
    component: LayoutComponent, // Todas las rutas usan el mismo layout
    children: [
      { path: 'home', component: HomeComponent }, // Home público (eager: es la página de entrada)
      // Cada feature privada se carga bajo demanda con sus propias rutas
      {
        path: '',
        canActivate: [authGuard],
        children: [
          {
            path: 'dashboard',
            loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
          },
          { path: 'goals', loadChildren: () => import('./features/goals/goals.routes').then(m => m.GOALS_ROUTES) },
          { path: 'tasks', loadChildren: () => import('./features/tasks/tasks.routes').then(m => m.TASKS_ROUTES) },
          {
            path: 'reminders',
            loadChildren: () => import('./features/reminders/reminders.routes').then(m => m.REMINDERS_ROUTES)
          }
        ]
      }
    ]
  },
  // Ruta comodín para redirigir cualquier URL no encontrada
  { path: '**', redirectTo: 'home' }
];
