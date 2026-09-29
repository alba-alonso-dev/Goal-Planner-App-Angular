# 🎯 Goal Planner

Aplicación web para **planificar objetivos, dividirlos en hitos, organizar tareas recurrentes y no olvidar recordatorios**, con un dashboard de progreso.

Construida con **Angular 19** (standalone components + signals), Bootstrap 5 y Chart.js, sobre la API pública [FreeProjectAPI · GoalTracker](https://api.freeprojectapi.com).

> ⚠️ **Estado del proyecto:** prototipo / proyecto de aprendizaje. Consulta [Estado actual y limitaciones conocidas](#-estado-actual-y-limitaciones-conocidas) y la [revisión de arquitectura](docs/ARCHITECTURE_REVIEW.md) antes de usarlo con datos reales.

---

## ✨ Funcionalidades

| Módulo            | Qué permite                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autenticación** | Registro, login (con login automático tras registrarse) y logout. Rutas privadas protegidas por guard.                                                                                |
| **Goals**         | Crear, editar y ver objetivos con fechas de inicio/fin e **hitos (milestones)**. Progreso calculado a partir de los hitos completados. Filtros por estado y búsqueda.                 |
| **Tasks**         | Tareas **diarias, semanales o mensuales**, agrupadas por frecuencia y colapsables. Marcar como completadas, editar, eliminar, filtrar (pendientes / completadas / vencidas) y buscar. |
| **Reminders**     | Recordatorios con fecha y hora, tiempo restante, marcado como "acknowledged", detección de vencidos y agrupación (hoy, mañana, esta semana…).                                         |
| **Dashboard**     | KPIs globales, tasa de completado y gráficas de tareas (7 días), estado de goals y próximos recordatorios.                                                                            |
| **Home**          | Landing pública con presentación de funcionalidades.                                                                                                                                  |

---

## 🧱 Stack

| Capa      | Tecnología                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | Angular 19.2 · standalone components · signals · control flow (`@if`, `@for`) |
| Lenguaje  | TypeScript 5.7 (`strict`, `strictTemplates`)                                  |
| UI        | Bootstrap 5.3, Bootstrap Icons y Font Awesome 6 (CDN)                         |
| Gráficas  | Chart.js 4                                                                    |
| HTTP      | `HttpClient` + RxJS 7.8                                                       |
| Tests     | Karma + Jasmine · CI con GitHub Actions                                       |

---

## 🚀 Puesta en marcha

### Requisitos

- **Node.js** 18.19+ / 20.11+ / 22 (requisitos de Angular 19)
- **npm** 9+

### Instalación y arranque

```bash
git clone https://github.com/alba-alonso-dev/Goal-Planner-App-Angular.git
cd Goal-Planner-App-Angular
npm ci
npm start            # ng serve → http://localhost:4200
```

La aplicación usa directamente la API pública, así que no hace falta levantar ningún backend. Crea una cuenta desde el botón de login de la barra de navegación.

### Scripts

| Comando           | Descripción                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `npm start`       | Servidor de desarrollo con recarga en caliente (`ng serve`).     |
| `npm run build`   | Build de producción en `dist/goal-planer/`.                      |
| `npm run watch`   | Build de desarrollo en modo watch.                               |
| `npm test`        | Tests unitarios con Karma (Chrome, modo watch).                  |
| `npm run test:ci` | Tests en Chrome headless, una sola ejecución (el que usa la CI). |

> `test:ci` necesita Chrome/Chromium instalado; si no está en el `PATH`, indica su ruta con `CHROME_BIN`.

### Integración continua

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada Pull Request: `npm ci` → `npm run test:ci` → `npm run build`.

---

## 🗂️ Estructura del proyecto

```
src/
├── index.html                 # Shell HTML (+ CDNs de iconos)
├── main.ts                    # bootstrapApplication(AppComponent, appConfig)
├── styles.css                 # Estilos globales y variables CSS
└── app/
    ├── app.config.ts          # Providers: router, HttpClient
    ├── app.routes.ts          # Rutas (Layout + páginas lazy, guard en las privadas)
    ├── guards/
    │   └── auth.guard.ts      # Redirige a /home si no hay sesión
    ├── model/                 # Interfaces DTO (Request/Response) y de vista
    │   ├── goal.ts  task.ts  reminder.ts  user.ts  dashboard.ts  home.ts
    ├── services/
    │   ├── auth.service.ts          # Login/registro, sesión en signal + localStorage
    │   ├── goal.service.ts          # CRUD de goals + milestones, cálculo de progreso
    │   ├── task.service.ts          # CRUD de tareas, vencimientos y estadísticas
    │   ├── reminder.service.ts      # CRUD de recordatorios, tiempo restante y estadísticas
    │   ├── dashboard.service.ts     # Agrega tasks/goals/reminders en stats y datos de gráficas
    │   └── notification.service.ts  # Toasts basados en signals
    └── components/
        ├── layout/  navbar/  footer/  toast-container/   # Shell de la aplicación
        ├── home/  login-modal/                           # Zona pública
        ├── dashboard/                                    # Analítica
        ├── goal-list/  goal-item/  goal-details/  new-goal/
        ├── task-list/  task-item/  task-details/  new-task/
        └── reminder-list/  reminder-item/  reminder-details/  new-reminder/
src/testing/
    └── fixtures.ts            # Datos de prueba compartidos por los specs
```

### Rutas

| Ruta         | Componente              | Acceso         |
| ------------ | ----------------------- | -------------- |
| `/home`      | `HomeComponent`         | Pública        |
| `/dashboard` | `DashboardComponent`    | 🔒 Autenticado |
| `/goals`     | `GoalListComponent`     | 🔒 Autenticado |
| `/tasks`     | `TaskListComponent`     | 🔒 Autenticado |
| `/reminders` | `ReminderListComponent` | 🔒 Autenticado |
| `**`         | → `/home`               | —              |

Todas las rutas se renderizan dentro de `LayoutComponent` (navbar + contenido + footer + toasts). Las rutas privadas se cargan bajo demanda (`loadComponent`), de modo que Chart.js solo se descarga al abrir el dashboard.

---

## 🏛️ Arquitectura

```
┌──────────────────────────── Componentes (UI) ────────────────────────────┐
│  *-list (contenedores)  →  *-item / *-details / new-* (presentación/modal)│
└───────────────┬───────────────────────────────────────────────┬──────────┘
                │ signals / computed                            │ toasts
┌───────────────▼──────────── Servicios (root) ─────────────────▼──────────┐
│ AuthService ─┬─ GoalService ─┐                                           │
│              ├─ TaskService ─┼─► DashboardService (stats + chart data)   │
│              └─ ReminderService┘            NotificationService          │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ HttpClient (DTO → modelo con campos calculados)
┌───────────────▼──────────────────────────────────────────────────────────┐
│        https://api.freeprojectapi.com/api/GoalTracker/*                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Decisiones clave**

- **Standalone + signals**: sin `NgModule`; el estado de UI vive en `signal`/`computed` y los servicios exponen `Observable` para HTTP.
- **Sesión**: `AuthService.loggedUser` es un `signal<User | null>` persistido en `localStorage`; `authGuard` lo consulta.
- **Campos derivados**: los servicios transforman las respuestas de la API añadiendo `progress`, `isOverdue`, `daysRemaining`, `timeRemaining`, etc.
- **Dashboard**: `DashboardService` combina las tres colecciones (`combineLatest`) y expone estadísticas como `computed`.

### Endpoints consumidos

| Recurso   | Endpoints (`/api/GoalTracker/...`)                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `POST login`, `POST register`                                                                                                      |
| Goals     | `GET getAllGoalsByUser?userId=`, `GET getGoal/{id}`, `POST createGoalWithMilestones`, `PUT updateGoalWithMilestones/{id}`          |
| Tasks     | `GET getAllTasks?userId=`, `GET getTask/{id}`, `POST createTask`, `PUT updateTask/{id}`, `DELETE deleteTask/{id}`                  |
| Reminders | `GET getReminders?userId=`, `GET getReminder/{id}`, `POST createReminder`, `PUT updateReminder/{id}`, `DELETE deleteReminder/{id}` |

---

## 🚧 Estado actual y limitaciones conocidas

Resumen de la [revisión de arquitectura completa](docs/ARCHITECTURE_REVIEW.md):

- ⚠️ **Tamaño del bundle**: el build de producción pasa, pero el bundle inicial (613 kB, ~124 kB transferidos) supera el aviso de 500 kB, sobre todo por el CSS completo de Bootstrap (~234 kB). Pendiente: importar solo los parciales SCSS necesarios.
- 🧪 **Cobertura de tests baja**: la suite está en verde, pero la mayoría de specs solo comprueban que el componente se crea; la lógica de negocio aún no tiene tests.
- 🔐 **Seguridad**: no hay token; la sesión es el perfil de usuario en `localStorage` y la API identifica al usuario por `userId` en la petición. **No usar con datos sensibles.**
- 📊 **Dashboard**: la "actividad reciente" usa marcas de tiempo simuladas y los selectores de periodo/fecha aún no filtran.
- 🗃️ **Archivar** goals/recordatorios completados solo los oculta en memoria (reaparecen al recargar). La API no expone borrado de goals.
- 🌐 Textos mezclados en inglés y español; fechas formateadas con locale `es-ES` fijo.

---

## 🗺️ Roadmap

Detalle y justificación en [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md#4-hoja-de-ruta-propuesta).

1. ✅ **Estabilizar** — build y tests en verde, limpieza de dependencias no usadas, CI con GitHub Actions.
2. **Fundamentos** — `environment` + `API_BASE_URL`, interceptores HTTP, helpers compartidos, ESLint/Prettier, `OnPush` e `input()/output()`.
3. **Arquitectura por features** — `core/ shared/ features/`, stores con signals como fuente única de verdad, lógica de dominio en funciones puras testeadas, Reactive Forms tipados.
4. **Producto** — backend con autenticación real, i18n, accesibilidad, e2e con Playwright, notificaciones push.

---

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/mi-cambio`.
2. Asegúrate de que `npm test` y `npm run build` pasan.
3. Abre un Pull Request describiendo el cambio.

Convenciones del proyecto: componentes standalone generados con `ng generate` (los _schematics_ ya apuntan a `src/app/components`, `services`, `guards`…), `inject()` para dependencias y signals para estado de UI.

---

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE.txt) · © 2026 Alba Alonso.
