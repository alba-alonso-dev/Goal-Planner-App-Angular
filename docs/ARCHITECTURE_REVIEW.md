# Revisión de arquitectura — Goal Planner (Angular)

> Revisión realizada con perspectiva de Senior/Staff Software Architect sobre el estado del repositorio en la rama `claude/dreamy-euler-8c4f1x` (commit `bf91e80`, septiembre 2026).
> Todas las afirmaciones marcadas como **[verificado]** se han comprobado ejecutando `npm ci`, `ng build` y `ng test` sobre el código actual.

---

## 1. Resumen ejecutivo

Goal Planner es una SPA en **Angular 19 (standalone components + signals)** que gestiona **objetivos (goals) con hitos (milestones), tareas recurrentes y recordatorios**, con un dashboard de estadísticas (Chart.js). Consume una API REST pública de terceros (`api.freeprojectapi.com/api/GoalTracker`).

**Puntos fuertes**

- Stack moderno: componentes standalone, `signal`/`computed`, nueva sintaxis de control de flujo (`@for`, `@if`), guard funcional, `inject()`.
- TypeScript en modo `strict` con `strictTemplates`: buena base de seguridad de tipos.
- Separación básica en capas (`components/`, `services/`, `model/`, `guards/`) y modelos Request/Response diferenciados.
- UX cuidada: estados de carga/error, filtros, búsqueda, modales de detalle, toasts.

**Riesgos principales (por orden de impacto)**

| #   | Riesgo                                                                                                                                                 | Severidad  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | El **build de producción falla** (`ng build` excede el budget de 1 MB) **[verificado]**                                                                | 🔴 Crítico |
| 2   | La **suite de tests no compila**; tras corregirlo, **20 de 29 tests fallan** por falta de providers **[verificado]**                                   | 🔴 Crítico |
| 3   | **Modelo de seguridad inexistente**: no hay token; la sesión es un objeto `User` en `localStorage` y la API filtra por `userId` en query string (IDOR) | 🔴 Crítico |
| 4   | **Datos falsos en el dashboard**: la "actividad reciente" usa `Math.random()` como timestamp; las tareas "completadas" se fechan con `dueDate`         | 🟠 Alto    |
| 5   | **Estado global incoherente**: `DashboardService` carga datos en su constructor (singleton) y no se invalida al cambiar de usuario / hacer logout      | 🟠 Alto    |
| 6   | **Duplicación masiva** en servicios (URL base, `handleError`, `formatToISOString`, comprobación de usuario)                                            | 🟡 Medio   |
| 7   | Configuración SSR huérfana, dependencias no usadas y 3 librerías de iconos                                                                             | 🟡 Medio   |
| 8   | Funcionalidades "fantasma": archivar solo en memoria, filtros de periodo/fecha del dashboard que no hacen nada                                         | 🟡 Medio   |

---

## 2. Inventario técnico

| Aspecto        | Estado actual                                                                               |
| -------------- | ------------------------------------------------------------------------------------------- |
| Framework      | Angular 19.2, standalone, zone.js                                                           |
| Estado         | Signals locales en componentes + servicios `providedIn: 'root'`                             |
| HTTP           | `HttpClient` sin interceptores                                                              |
| UI             | Bootstrap 5.3 (CSS), Bootstrap Icons (CDN), Font Awesome 4 (npm) **y** Font Awesome 6 (CDN) |
| Gráficas       | Chart.js 4 (`registerables` completos)                                                      |
| Notificaciones | `NotificationService` propio **y** `ngx-toastr` configurado pero sin uso                    |
| Tests          | Karma + Jasmine, sólo specs autogeneradas "should create"                                   |
| CI/CD          | Ninguno                                                                                     |
| Lint/format    | Ninguno (sólo `.editorconfig`)                                                              |
| Tamaño         | ~6.700 líneas en componentes, ~1.300 en servicios, 23 componentes, 6 servicios              |

### Métricas de calidad observadas

- **92** llamadas a `console.*` en código de producción (incluido el volcado del payload completo de peticiones).
- **45** usos de `any` (`: any`, `as any`, `<any>`) pese a `strict: true`.
- **33** `subscribe()` manuales, **0** usos de `takeUntilDestroyed`/`DestroyRef`.
- **0** componentes con `ChangeDetectionStrategy.OnPush`.
- **6** usos de `window.confirm()` para confirmaciones destructivas.
- **8** `setTimeout`/`effect` en componentes para sincronizar vista y datos (p. ej. esperar 500 ms/1000 ms a que carguen las gráficas).

---

## 3. Hallazgos detallados

### 3.1 Build y calidad de entrega 🔴

**Build de producción roto [verificado].**

```
✘ [ERROR] bundle initial exceeded maximum budget. Budget 1.00 MB was not met by 25.74 kB with a total of 1.03 MB.
```

Causas:

- Todas las rutas se cargan de forma **eager** en `app.routes.ts` → Chart.js y todos los componentes van al bundle inicial.
- `Chart.register(...registerables)` registra **todos** los tipos de gráfica aunque solo se usan `line`, `doughnut` y `bar`.
- CSS duplicado: Bootstrap completo + Font Awesome 4 empaquetados, más Font Awesome 6 y Bootstrap Icons por CDN.

**Propuesta**

1. Lazy loading con `loadComponent` en todas las rutas protegidas (el dashboard, con Chart.js, sale del bundle inicial).
2. Registrar solo los controladores/escala/elementos usados de Chart.js (tree-shaking).
3. Unificar en **una** librería de iconos (Bootstrap Icons ya encaja con Bootstrap) y eliminar `font-awesome@4` y el CDN de FA6.
4. Eliminar `ngx-toastr`, `aos` y `@types/chart.js` (Chart.js 4 ya incluye sus tipos).

### 3.2 Testing 🔴

**Estado [verificado]:**

- `ng test` no llega a ejecutarse: `auth.guard.spec.ts` no compila (`TS2554: Expected 0 arguments, but got 2`) porque `authGuard` se declaró como `() => ...` en lugar de `CanActivateFn`.
- Parcheando ese error, se ejecutan 29 specs y **fallan 20**: todas por `NullInjectorError` (falta `provideHttpClient()`/`provideHttpClientTesting()` y `provideRouter([])` en los `TestBed`).
- No hay ni un solo test de comportamiento: toda la lógica de negocio (progreso de goals, cálculo de vencimientos, agrupación de recordatorios, estadísticas) está sin cubrir.

**Propuesta**

- Tipar el guard como `CanActivateFn` y añadir providers de test estándar.
- Extraer la lógica de fechas/estadísticas a **funciones puras** (ver 3.5) y testearlas con tablas de casos (bordes de medianoche, zonas horarias, listas vacías).
- Tests de servicios con `HttpTestingController`; tests de componentes con harnesses / Testing Library.
- A medio plazo, migrar de Karma (deprecado) a **Vitest** o **Jest** y añadir e2e con **Playwright** para los flujos login → crear goal → completar hito.

### 3.3 Seguridad 🔴

1. **Sin autenticación real.** `login()` devuelve un `User` que se guarda en `localStorage`. El guard solo comprueba `loggedUser() !== null`: cualquiera puede escribir `localStorage.user = '{"userId": 1}'` y acceder.
2. **IDOR / autorización rota en la API**: los endpoints reciben `userId` como parámetro (`getAllTasks?userId=…`) y las operaciones `getX/{id}`, `updateX/{id}`, `deleteX/{id}` no envían credenciales. Cualquier usuario puede leer/modificar/borrar datos de otro cambiando un número. Es un problema del backend, pero el frontend no debería construirse sobre él para datos reales.
3. **Fuga de datos en consola**: los servicios imprimen payloads completos, IDs de usuario y respuestas.
4. **Recursos de CDN sin SRI** (`integrity`) en `index.html`.
5. `JSON.parse` de `localStorage` sin validación ni `try/catch`: un valor corrupto rompe el arranque de la app.

**Propuesta**

- Backend propio (o BaaS) con **JWT/OIDC**; el `userId` debe derivarse del token en servidor, nunca del cliente.
- `HttpInterceptor` funcional para adjuntar el token, gestionar 401 (logout + redirect) y centralizar errores.
- Guardar como mucho el token (idealmente cookie `HttpOnly` + `SameSite`), no el perfil.
- Logger inyectable que en producción no emita `debug`/`info`.
- Añadir SRI o autoalojar los assets; definir una **CSP**.

### 3.4 Gestión de estado y ciclo de vida 🟠

- `DashboardService` es singleton y llama a `loadDashboardData()` **en el constructor**. Si se instancia antes del login lanza error; tras logout/login con otro usuario puede mostrar datos del anterior hasta que se refresque. Además `DashboardComponent.ngOnInit` vuelve a cargarlo → **doble petición** de las 3 colecciones.
- Cada lista (`TaskListComponent`, `GoalListComponent`, `ReminderListComponent`) mantiene su propia copia de los datos y **recarga toda la colección tras cada mutación** (crear/editar/toggle/borrar). No hay caché ni actualizaciones optimistas.
- `toggleTaskCompletion` hace **GET + PUT** por cada clic (2 round-trips) cuando el componente ya tiene la tarea.
- `GoalService.getAllGoalsByUser()` lanza, **como efecto secundario dentro de un `map`**, un `forkJoin` de N peticiones de detalle cuya suscripción nunca se gestiona y que **muta** los objetos ya emitidos (el progreso "salta" sin pasar por signals → la UI puede no actualizarse).
- `DashboardService.getRecentTasks()` hace `this.tasks().sort(...)`: **muta el array del signal** en sitio.
- Suscripciones manuales sin `takeUntilDestroyed`.

**Propuesta: _store_ por feature basado en signals**

```ts
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private api = inject(TaskApi);
  private readonly _tasks = signal<Task[]>([]);
  readonly tasks = this._tasks.asReadonly();
  readonly stats = computed(() => computeTaskStats(this._tasks(), new Date()));

  load = rxMethod<void>(/* ... */); // o resource()/httpResource() de Angular 19+
  toggle(task: Task) {
    /* optimista + rollback */
  }
}
```

- Un único origen de verdad por agregado (tasks/goals/reminders) consumido tanto por las listas como por el dashboard (el `DashboardService` pasa a ser un conjunto de `computed` sobre los stores).
- Reset de stores en logout (`AuthService` emite evento o los stores dependen de `currentUser` vía `effect`/`resource`).
- Valorar **NgRx SignalStore** si el dominio crece.

### 3.5 Lógica de dominio y corrección 🟠

- **Actividad reciente inventada**: `timestamp: new Date(now - Math.random() * 86400000)` para tareas completadas, goals alcanzados y recordatorios reconocidos. Además los IDs incluyen `Date.now()`, por lo que cambian en cada recomputación (rompe `track`).
- **Gráfica de tareas**: "Completed" usa `dueDate` como fecha de finalización (la API no guarda `completedDate`).
- **Recordatorios "This Week"**: el cálculo difiere entre `DashboardService.stats` (compara `Date` completos con medianoche → casi nunca excluye hoy/mañana correctamente), `getReminderChartData` y `ReminderService.getReminderStats`. Tres implementaciones de la misma regla con resultados distintos.
- **Zonas horarias**: se usa `toISOString().split('T')[0]` (UTC) para agrupar días locales → en España los eventos entre 00:00 y 02:00 caen en el día anterior.
- **Campos derivados congelados**: `isOverdue`, `timeRemaining`, `daysRemaining` se calculan al recibir la respuesta y nunca se recalculan; si la pestaña queda abierta, quedan obsoletos.
- `formatToISOString` devuelve **la fecha actual** si la entrada es inválida: corrompe datos silenciosamente en lugar de fallar la validación.
- `isAchieved` se fuerza a `true` si todos los hitos están completados, pero nunca vuelve a `false` si se desmarca uno.
- **Archivar** (goals/recordatorios) solo filtra el array en memoria; al recargar todo reaparece.
- Selectores de periodo/fecha del dashboard sin implementar (comentarios "Aquí puedes implementar…").
- Locale mezclado: textos en inglés, errores en español, fechas con `'es-ES'` hardcodeado.

**Propuesta**

- Mover estas reglas a un módulo `domain/` de **funciones puras** (`isOverdue(task, now)`, `bucketReminders(reminders, now)`, `goalProgress(goal)`), con `now` inyectable para testear.
- Calcular derivados en `computed` a partir de un signal `now` que avanza cada minuto, no en el mapeo HTTP.
- Usar `date-fns`/`Temporal` para aritmética de fechas locales.
- Eliminar datos inventados; si la API no da la información, no mostrarla (o pedir el campo al backend).
- Ocultar o implementar las funciones incompletas (archivar, filtros del dashboard).
- i18n con `@angular/localize` o Transloco; `LOCALE_ID` en lugar de `'es-ES'` hardcodeado.

### 3.6 Diseño de servicios y capa HTTP 🟡

- `baseUrl` repetida en 4 servicios (con dos formatos distintos) y sin `environment`.
- `handleError` y `formatToISOString` **copiados literalmente** en `GoalService`, `TaskService` y `ReminderService`.
- `handleError` se pasa como referencia (`catchError(this.handleError)`) → `this` es `undefined` dentro; hoy funciona por casualidad porque no usa `this`.
- Los servicios mezclan responsabilidades: acceso HTTP, mapeo DTO→modelo, reglas de negocio y estadísticas.
- Entradas tipadas como `any` (`createTask(taskData: any)`), lo que anula el valor de `strict`.
- Modelos `XRequest` y `XResponse` duplican campos en lugar de derivarse (`Omit`, `Pick`).

**Propuesta de capas**

```
core/
  config/        -> API_BASE_URL (InjectionToken) + environments
  http/          -> authInterceptor, errorInterceptor, ApiError
  auth/          -> AuthService, authGuard (CanActivateFn)
shared/
  ui/            -> confirm-dialog, empty-state, spinner, toast
  utils/date/    -> helpers puros de fecha
features/
  goals/   { data-access/goal.api.ts, goal.store.ts, domain/, ui/, goals.routes.ts }
  tasks/   { ... }
  reminders/ { ... }
  dashboard/ { ... }
```

- `XxxApi` (solo HTTP + mapeo DTO), `XxxStore` (estado), `domain/` (reglas puras), `ui/` (componentes presentacionales con `input()`/`output()` y `OnPush`).

### 3.7 Componentes y rendimiento 🟡

- Componentes "god" de 200–420 líneas TS + 230–400 líneas HTML (dashboard, goal-details, reminder-list, task-list). Mezclan contenedor y presentación.
- `DashboardComponent` sincroniza Chart.js con `setTimeout(…, 100/500/1000)` y un `effect` que dispara otro `setTimeout`: condiciones de carrera y trabajo duplicado. Además declara `@Inject(PLATFORM_ID)` como decorador de **propiedad** (no tiene efecto; se reasigna en el constructor).
- Sin `OnPush`: con signals es prácticamente gratis activarlo y reduce ciclos de detección.
- Inputs/outputs con decoradores clásicos (`@Input`/`@Output`) → migrar a `input()`/`output()`/`model()`.
- Formularios template-driven con `ngModel` sobre objetos mutables; validación mínima (fechas fin < inicio, hitos fuera de rango). **Reactive Forms tipados** encajan mejor en goals con milestones dinámicos.
- `confirm()` nativo: no accesible ni estilable → componente de diálogo propio.
- Modales Bootstrap construidos a mano sin gestión de foco ni `Esc` → revisar accesibilidad (WCAG 2.1 AA).

### 3.8 Configuración y tooling 🟡

- **SSR huérfano**: existen `app.config.server.ts` y `app.routes.server.ts` pero no hay `main.server.ts`, `server.ts`, ni dependencias `@angular/ssr`/`@angular/platform-server`; el script `serve:ssr:goal-planer` no funciona. Además `AuthService` accede a `localStorage` en el constructor, incompatible con SSR. → Eliminar o completar la configuración (y proteger `localStorage` con `isPlatformBrowser`).
- `app.component.html` no se usa (el componente usa `template` inline).
- `provideAnimations` importado sin uso junto a `provideAnimationsAsync`.
- Sin ESLint (`@angular-eslint`), Prettier, Husky/lint-staged, ni pipeline CI.
- `package.json` con `name: "goal-planer"` (errata) y `version: 0.0.0`.
- Budget de estilos por componente a 4 kB: el dashboard (211 líneas CSS) está cerca del límite.

---

## 4. Hoja de ruta propuesta

### Fase 0 — Estabilizar (1–2 días) ✅ completada en la rama `fase0`

- [x] Lazy loading de rutas + Chart.js tree-shaken → `ng build` en verde (bundle inicial 1,03 MB → 613 kB; transferencia 220 kB → 124 kB).
- [x] `authGuard: CanActivateFn` y providers de test → `ng test` en verde (33/33, incluidos tests reales del guard y de la restauración de sesión).
- [x] Eliminar dependencias muertas (`ngx-toastr`, `aos`, `font-awesome@4`, `@types/chart.js`, `@types/express`, `@angular/animations`) y la config SSR huérfana.
- [x] Eliminar `console.log` (incluidos los volcados de payloads); lectura de `localStorage` tolerante a valores corruptos.
- [x] Pipeline de **GitHub Actions**: `npm ci` → test (ChromeHeadless) → build. _(El paso de lint se añadirá con ESLint en la Fase 1.)_
- Pendiente de fases siguientes: bajar el bundle inicial por debajo del aviso de 500 kB (Bootstrap SCSS parcial) y unificar las librerías de iconos (FA6 + Bootstrap Icons por CDN).

### Fase 1 — Fundamentos (1–2 semanas) ✅ completada en la rama `fase1`

- [x] `environment.ts` / `environment.development.ts` + token `API_BASE_URL` (antes la URL estaba copiada en 4 servicios con dos formatos).
- [x] `errorInterceptor` + `ApiError` únicos (logout y redirección en 401). Eliminadas las tres copias de `handleError`. `AuthService.withUser()` centraliza la comprobación de sesión. _(No hay interceptor de auth porque la API no usa token; llegará con el backend de la Fase 3.)_
- [x] `shared/utils/date.ts` con tests: fechas en hora local, `toApiDate` falla ante fechas inválidas en lugar de usar "hoy".
- [x] ESLint (angular-eslint + typescript-eslint, regla que exige `OnPush`) + Prettier + husky/lint-staged; lint y `format:check` en la CI.
- [x] `OnPush` + `input()`/`output()` en los 19 componentes; estado asíncrono en signals; formularios reactivos tipados en `new-*` y `*-details`.
- [x] Dashboard sin datos simulados; eliminados los filtros de periodo/fecha y el "archivar" que solo ocultaba en memoria.
- [x] Tipos de entrada (`TaskInput`, `ReminderInput`, `GoalInput`) en lugar de `any` en los servicios.
- Pendiente (pasa a fases siguientes): bundle inicial por debajo de 500 kB (Bootstrap SCSS parcial), unificar iconos y resolver los 41 avisos de accesibilidad que reporta el lint.

**Bugs adicionales encontrados y corregidos durante la Fase 1** (verificados en navegador con Playwright y la API simulada):

| Bug                                                                                                     | Impacto                                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `toggleReminderAcknowledgement` y `deleteReminder` de la lista de recordatorios eran métodos vacíos     | Marcar o borrar un recordatorio desde la lista no hacía nada    |
| La plantilla del login nunca mostraba `errorMessage` ni el estado de carga                              | Un login fallido no daba ningún feedback                        |
| El campo "móvil" del registro tenía el placeholder "Confirm Password"                                   | Formulario de registro confuso                                  |
| Las gráficas se creaban con `setTimeout(500)` antes de que existieran los `<canvas>`                    | Con una API lenta (1,5 s) no se dibujaba ninguna gráfica (0/3)  |
| El formulario de edición de recordatorios mostraba la hora en UTC en un `datetime-local`                | Guardar sin tocar nada desplazaba la hora según el huso horario |
| Fechas `YYYY-MM-DD` interpretadas como medianoche UTC                                                   | En husos al oeste de UTC las fechas se mostraban un día antes   |
| Tras un error al crear, el modal `new-*` se quedaba con el spinner y la lista se sustituía por el error | Había que recargar la página                                    |
| `getAllGoalsByUser` lanzaba una suscripción huérfana que mutaba objetos ya emitidos                     | El progreso de los goals podía no actualizarse en pantalla      |
| `toggleTaskCompletion` hacía GET + PUT por cada clic                                                    | Doble latencia                                                  |
| `DashboardService` cargaba datos en su constructor y el componente otra vez                             | Cada visita lanzaba las peticiones dos veces                    |

### Fase 2 — Arquitectura por features (2–4 semanas)

- [ ] Estructura `core/ shared/ features/` con rutas lazy por feature.
- [ ] Stores por agregado basados en signals (o NgRx SignalStore); dashboard derivado de ellos.
- [ ] Lógica de dominio en funciones puras con tests unitarios exhaustivos.
- [ ] Reactive Forms tipados y validaciones cruzadas de fechas.
- [ ] Actualizaciones optimistas y eliminación del patrón "recargar todo".

### Fase 3 — Producto y plataforma

- [ ] Backend propio con autenticación real (JWT/OIDC) y autorización por propietario.
- [ ] i18n (es/en) y `LOCALE_ID`.
- [ ] Accesibilidad (diálogos, foco, contraste) y tests e2e con Playwright.
- [ ] Valorar zoneless (`provideExperimentalZonelessChangeDetection` → estable en Angular 20+) y actualización a la última versión de Angular.
- [ ] Notificaciones reales de recordatorios (Web Push / Service Worker).

---

## 5. Apéndice — evidencia de verificación

```bash
npm ci                 # OK
npx ng build           # ✘ bundle initial 1.03 MB > budget 1.00 MB
npx ng test            # ✘ TS2554 en src/app/guards/auth.guard.spec.ts:8
# Con el spec del guard parcheado temporalmente:
#   Executed 29 of 29 (20 FAILED) — todos NullInjectorError (HttpClient / ActivatedRoute)
```
