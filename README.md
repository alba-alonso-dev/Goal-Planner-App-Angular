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
| UI        | Bootstrap 5.3 (SCSS a medida) y Bootstrap Icons (npm, solo los iconos usados) |
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

| Comando           | Descripción                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `npm start`       | Servidor de desarrollo con recarga en caliente (`ng serve`).                                    |
| `npm run build`   | Build de producción en `dist/goal-planer/`.                                                     |
| `npm run watch`   | Build de desarrollo en modo watch.                                                              |
| `npm test`        | Tests unitarios con Karma (Chrome, modo watch).                                                 |
| `npm run test:ci` | Tests en Chrome headless, una sola ejecución (el que usa la CI).                                |
| `npm run lint`    | ESLint (TypeScript, plantillas y accesibilidad).                                                |
| `npm run format`  | Formatea el código con Prettier (`format:check` solo comprueba).                                |
| `npm run icons`   | Regenera `src/styles/icons.generated.css` con los iconos usados (`icons:check` solo comprueba). |

> `test:ci` necesita Chrome/Chromium instalado; si no está en el `PATH`, indica su ruta con `CHROME_BIN`.

### Integración continua

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada Pull Request: `npm ci` → `lint` → `format:check` → `icons:check` → `test:ci` → `build`.

En local, un hook de **husky** ejecuta `lint-staged` (ESLint + Prettier sobre los archivos preparados) antes de cada commit. Para ignorar en `git blame` el commit de formateo masivo: `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

---

## 🗂️ Estructura del proyecto

Organizada por **features**: cada una contiene su página, sus componentes de presentación, su acceso a datos, su estado y sus reglas de negocio.

```
src/
├── index.html                 # Shell HTML (sin dependencias de CDN)
├── main.ts                    # bootstrapApplication(AppComponent, appConfig)
├── styles.css                 # Estilos globales, variables CSS y tamaños de icono
├── styles/
│   ├── bootstrap.scss         # Bootstrap con solo los módulos y utilidades en uso
│   └── icons.generated.css    # Generado por scripts/generate-icons.mjs (no editar)
├── environments/              # environment.ts (prod) / environment.development.ts (ng serve)
├── testing/fixtures.ts        # Datos de prueba, reloj fijo y sesión de test para los specs
└── app/
    ├── app.config.ts          # Providers: router, HttpClient + errorInterceptor
    ├── app.routes.ts          # Layout + home; cada feature privada con loadChildren y authGuard
    ├── core/                  # Singletons transversales
    │   ├── auth/              # AuthService, authGuard, User, login-modal
    │   ├── config/            # Token API_BASE_URL
    │   ├── http/              # ApiError + errorInterceptor (normaliza errores, logout en 401)
    │   ├── layout/            # layout, navbar, footer
    │   ├── notifications/     # NotificationService + toast-container
    │   └── time/              # ClockService: la hora actual como signal (tick cada minuto)
    ├── shared/                # Código reutilizable sin dependencias de features
    │   ├── data-access/       # EntityCollection: colección con signals, caché y cambios optimistas
    │   ├── forms/             # Validadores de fechas (orden, rango de milestones, no en el pasado)
    │   └── utils/date.ts      # Helpers de fecha en hora local
    └── features/
        ├── home/              # Landing pública
        ├── dashboard/         # Página + domain/dashboard.rules.ts (stats, gráficas, "needs attention")
        └── tasks/ | goals/ | reminders/
            ├── <x>.routes.ts          # Rutas de la feature (lazy)
            ├── <x>.model.ts           # DTO de la API, *View (con campos derivados), *Input, filtros
            ├── <x>-list/              # Página (contenedor): lee del store y orquesta
            ├── ui/                    # Presentación: <x>-item, <x>-details, new-<x>
            ├── data-access/
            │   ├── <x>.api.ts         # HTTP puro: construye peticiones, sin estado
            │   └── <x>.store.ts       # Estado: fuente única de verdad, vistas derivadas, mutaciones
            └── domain/<x>.rules.ts    # Reglas de negocio en funciones puras (+ tests)
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

Todas las rutas se renderizan dentro de `LayoutComponent` (navbar + contenido + footer + toasts). Cada feature privada se carga bajo demanda con sus propias rutas (`loadChildren`) y el `authGuard` se declara una sola vez en la ruta padre; Chart.js solo se descarga al abrir el dashboard.

---

## 🏛️ Arquitectura

```
 features/<x>/<x>-list  (página)          ui/ (item, details, new-*)
        │  lee signals / llama acciones          ▲ input() / output()
        ▼                                        │
 data-access/<x>.store.ts ──────────────────────┘
   • EntityCollection: datos crudos de la API (caché por sesión)
   • vistas = domain/<x>.rules.ts (datos, ClockService.now())
   • acciones: create / update / toggle / delete (optimistas con rollback)
        │
        ▼
 data-access/<x>.api.ts  ── HttpClient + errorInterceptor ──►  api.freeprojectapi.com/api/GoalTracker/*

 dashboard ── computed sobre TaskStore + GoalStore + ReminderStore + domain/dashboard.rules.ts
```

**Decisiones clave**

- **Stores por feature como fuente única de verdad** (`TaskStore`, `GoalStore`, `ReminderStore`). Las páginas y el dashboard leen de ellos, así que un cambio hecho en una pantalla se ve en todas sin volver a pedir datos. Cada lista se pide **una vez por sesión**; el botón _Refresh_ del dashboard fuerza la recarga.
- **Actualizaciones optimistas**: marcar/desmarcar tareas, recordatorios y milestones, y borrar, se reflejan al momento y se revierten (solo esa entidad) si la API falla. Crear y editar actualizan únicamente la entidad afectada.
- **Reglas de negocio puras** en `domain/`: vencimientos, progreso, estados, estadísticas, filtros y agrupaciones se prueban sin Angular. Las fechas límite de tareas y goals son días naturales (vencen al terminar el día).
- **Campos derivados vivos**: las vistas (`TaskView`, `GoalView`, `ReminderView`) se calculan a partir de `ClockService.now()`, que avanza cada minuto; "vencido" o "en 2 horas" no se quedan congelados.
- **Sesión**: al cambiar de usuario (logout/login) los stores se vacían y se descartan las respuestas que lleguen tarde. `AuthService.withUser()` construye las peticiones que necesitan usuario y emite un `ApiError` 401 si no hay sesión.
- **Standalone + signals + `OnPush`** en todos los componentes, con `input()`/`output()`; los modales de detalle reciben la entidad del store (se selecciona por id).
- **Formularios reactivos tipados** con validadores de grupo reutilizables (`shared/forms`) para las reglas que cruzan campos.
- **Errores HTTP**: `errorInterceptor` convierte cualquier error en `ApiError` (`status`, `message` para el usuario, `serverMessage`) y cierra la sesión ante un 401.
- **Fechas**: los valores de `<input type="date">`/`datetime-local` se interpretan en **hora local** y se envían a la API en ISO 8601. Una fecha inválida produce un error en lugar de sustituirse por "hoy".

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

- 📦 **Tamaño del bundle**: bundle inicial de 496 kB (~113 kB transferidos), con poco margen respecto al aviso de 500 kB. Si una plantilla empieza a usar un componente o utilidad de Bootstrap excluido, hay que añadirlo en `src/styles/bootstrap.scss`.
- ♿ **Accesibilidad**: las reglas de accesibilidad de plantillas se aplican como error en el lint. Queda pendiente la gestión del foco en los modales (`role="dialog"`, foco atrapado, cierre con Escape).
- 🧪 **Tests**: las reglas de dominio, los stores, las APIs, los validadores, el interceptor y el guard tienen tests de comportamiento (se ejecutan también en otros husos horarios). La mayoría de componentes de UI solo tienen un test de creación y no hay tests e2e.
- 🔐 **Seguridad**: no hay token; la sesión es el perfil de usuario en `localStorage` y la API identifica al usuario por `userId` en la petición. **No usar con datos sensibles.**
- 📊 **Dashboard**: la API no guarda cuándo se completa una tarea, así que la gráfica muestra tareas creadas y con vencimiento por día, y "Needs Attention" lista solo elementos vencidos.
- 🗃️ No se pueden borrar ni archivar goals (la API no lo permite).
- 🌐 Textos mezclados en inglés y español; fechas formateadas con locale `es-ES` fijo.

---

## 🗺️ Roadmap

Detalle y justificación en [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md#4-hoja-de-ruta-propuesta).

1. ✅ **Estabilizar** — build y tests en verde, limpieza de dependencias no usadas, CI con GitHub Actions.
2. ✅ **Fundamentos** — `environment` + `API_BASE_URL`, interceptor de errores, helpers compartidos, ESLint/Prettier, `OnPush` e `input()/output()`, dashboard sin datos simulados.
3. ✅ **Arquitectura por features** — `core/ shared/ features/`, stores con signals como fuente única de verdad, actualizaciones optimistas, lógica de dominio en funciones puras testeadas, validaciones cruzadas de fechas.
4. **Producto** — backend con autenticación real, i18n, accesibilidad, e2e con Playwright, notificaciones push.

---

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/mi-cambio`.
2. Asegúrate de que `npm run lint`, `npm run test:ci` y `npm run build` pasan (el hook de pre-commit formatea y corrige lo que puede).
3. Abre un Pull Request describiendo el cambio.

Convenciones del proyecto:

- Iconos: `<i class="bi bi-<nombre>"></i>` de [Bootstrap Icons](https://icons.getbootstrap.com/); tras añadir uno nuevo, `npm run icons`.
- Código nuevo dentro de su feature (`features/<x>/`): la página en `<x>-list/`, la presentación en `ui/`, el HTTP en `data-access/<x>.api.ts`, el estado en `data-access/<x>.store.ts` y las reglas en `domain/` (con tests). Lo transversal va en `core/` y lo reutilizable en `shared/`.
- Los componentes no llaman a las APIs: usan el store de su feature. Las reglas de negocio no viven en componentes ni stores, sino en funciones puras de `domain/`.
- Componentes standalone (`ng generate component features/<x>/ui/<nombre>`), siempre con `OnPush` (lo exige ESLint).
- `inject()` para dependencias, `input()`/`output()` para la API de los componentes y signals para el estado de UI.
- URLs de la API solo a través de `API_BASE_URL`; errores HTTP como `ApiError`; fechas con los helpers de `shared/utils/date.ts`.

---

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE.txt) · © 2026 Alba Alonso.
