import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LayoutComponent } from './components/layout/layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: '',
    component: LayoutComponent, // Todas las rutas usan el mismo layout
    children: [
      { path: 'home', component: HomeComponent }, // Home público (eager: es la página de entrada)
      // Rutas protegidas cargadas bajo demanda para reducir el bundle inicial
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'goals',
        canActivate: [authGuard],
        loadComponent: () => import('./components/goal-list/goal-list.component').then(m => m.GoalListComponent)
      },
      {
        path: 'tasks',
        canActivate: [authGuard],
        loadComponent: () => import('./components/task-list/task-list.component').then(m => m.TaskListComponent)
      },
      {
        path: 'reminders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./components/reminder-list/reminder-list.component').then(m => m.ReminderListComponent)
      }
    ]
  },
  // Ruta comodín para redirigir cualquier URL no encontrada
  { path: '**', redirectTo: 'home' }
];
