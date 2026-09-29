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
| `npm run lint`    | ESLint (TypeScript, plantillas y accesibilidad).                 |
| `npm run format`  | Formatea el código con Prettier (`format:check` solo comprueba). |

> `test:ci` necesita Chrome/Chromium instalado; si no está en el `PATH`, indica su ruta con `CHROME_BIN`.

### Integración continua

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada Pull Request: `npm ci` → `lint` → `format:check` → `test:ci` → `build`.

En local, un hook de **husky** ejecuta `lint-staged` (ESLint + Prettier sobre los archivos preparados) antes de cada commit. Para ignorar en `git blame` el commit de formateo masivo: `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

---

## 🗂️ Estructura del proyecto

```
src/
├── index.html                 # Shell HTML (+ CDNs de iconos)
├── main.ts                    # bootstrapApplication(AppComponent, appConfig)
├── styles.css                 # Estilos globales y variables CSS
├── environments/              # environment.ts (prod) / environment.development.ts (ng serve)
└── app/
    ├── app.config.ts          # Providers: router, HttpClient + errorInterceptor
    ├── app.routes.ts          # Rutas (Layout + páginas lazy, guard en las privadas)
    ├── core/
    │   ├── config/api.config.ts     # Token API_BASE_URL (valor desde environment)
    │   └── http/                    # ApiError + errorInterceptor (normaliza errores, logout en 401)
    ├── shared/
    │   └── utils/date.ts            # Helpers de fecha en hora local (inputs date/datetime, API)
    ├── guards/
    │   └── auth.guard.ts      # Redirige a /home si no hay sesión
    ├── model/                 # DTO (Request/Response), tipos de formulario (*Input) y de vista
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

- **Standalone + signals + `OnPush`**: sin `NgModule`; todos los componentes usan `ChangeDetectionStrategy.OnPush`, `input()`/`output()` y guardan en signals cualquier estado que cambie de forma asíncrona. Los servicios exponen `Observable` para HTTP.
- **Sesión**: `AuthService.loggedUser` es un signal de solo lectura persistido en `localStorage`; `authGuard` lo consulta. `AuthService.withUser()` construye las peticiones que necesitan usuario y emite un `ApiError` 401 si no hay sesión.
- **Errores HTTP**: `errorInterceptor` convierte cualquier error en `ApiError` (`status`, `message` para el usuario, `serverMessage`) y cierra la sesión ante un 401.
- **Fechas**: los valores de `<input type="date">`/`datetime-local` se interpretan en **hora local** y se envían a la API en ISO 8601 (`shared/utils/date.ts`). Una fecha inválida produce un error en lugar de sustituirse por "hoy".
- **Campos derivados**: los servicios transforman las respuestas de la API añadiendo `progress`, `isOverdue`, `daysRemaining`, `timeRemaining`, etc.
- **Dashboard**: `DashboardService` carga las tres colecciones en paralelo (`forkJoin`) y expone estadísticas como `computed`; cada gráfica se enlaza a su `<canvas>` con `viewChild()` + `effect()`.

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

- ⚠️ **Tamaño del bundle**: el build de producción pasa, pero el bundle inicial (618 kB, ~126 kB transferidos) supera el aviso de 500 kB, sobre todo por el CSS completo de Bootstrap (~234 kB). Pendiente: importar solo los parciales SCSS necesarios.
- ♿ **Accesibilidad**: `npm run lint` reporta 41 avisos en plantillas (labels sin asociar, elementos clicables sin soporte de teclado, botones sin texto). Se abordarán en la fase de accesibilidad.
- 🧪 **Tests**: hay tests de comportamiento para servicios, interceptor, helpers de fecha, guard, dashboard y la lista de recordatorios; el resto de componentes solo comprueba que se crean.
- 🔐 **Seguridad**: no hay token; la sesión es el perfil de usuario en `localStorage` y la API identifica al usuario por `userId` en la petición. **No usar con datos sensibles.**
- 📊 **Dashboard**: la API no guarda cuándo se completa una tarea, así que la gráfica muestra tareas creadas y con vencimiento por día, y "Needs Attention" lista solo elementos vencidos.
- 🗃️ No se pueden borrar ni archivar goals (la API no lo permite).
- 🌐 Textos mezclados en inglés y español; fechas formateadas con locale `es-ES` fijo; iconos desde dos CDN (Font Awesome 6 y Bootstrap Icons).

---

## 🗺️ Roadmap

Detalle y justificación en [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md#4-hoja-de-ruta-propuesta).

1. ✅ **Estabilizar** — build y tests en verde, limpieza de dependencias no usadas, CI con GitHub Actions.
2. ✅ **Fundamentos** — `environment` + `API_BASE_URL`, interceptor de errores, helpers compartidos, ESLint/Prettier, `OnPush` e `input()/output()`, dashboard sin datos simulados.
3. **Arquitectura por features** — `core/ shared/ features/`, stores con signals como fuente única de verdad, lógica de dominio en funciones puras testeadas, Reactive Forms tipados.
4. **Producto** — backend con autenticación real, i18n, accesibilidad, e2e con Playwright, notificaciones push.

---

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/mi-cambio`.
2. Asegúrate de que `npm run lint`, `npm run test:ci` y `npm run build` pasan (el hook de pre-commit formatea y corrige lo que puede).
3. Abre un Pull Request describiendo el cambio.

Convenciones del proyecto:

- Componentes standalone generados con `ng generate` (los _schematics_ ya apuntan a `src/app/components`, `services`, `guards`…), siempre con `OnPush` (lo exige ESLint).
- `inject()` para dependencias, `input()`/`output()` para la API de los componentes y signals para el estado de UI.
- URLs de la API solo a través de `API_BASE_URL`; errores HTTP como `ApiError`; fechas con los helpers de `shared/utils/date.ts`.

---

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE.txt) · © 2026 Alba Alonso.
