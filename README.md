# 🎯 Goal Planner

Aplicación web para **planificar objetivos, dividirlos en hitos, organizar tareas recurrentes y no olvidar recordatorios**, con un dashboard de progreso.

Monorepo con el **frontend en Angular 22** (standalone, signals, zoneless) y un **backend propio en NestJS + PostgreSQL** (`server/`). Interfaz en inglés y español.

> La [revisión de arquitectura](docs/ARCHITECTURE_REVIEW.md) recoge el análisis inicial del proyecto, la hoja de ruta por fases y las decisiones tomadas en cada una.

---

## ✨ Funcionalidades

| Módulo        | Qué permite                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cuenta**    | Registro (abre la sesión), login y logout con una cookie `HttpOnly`. **Recuperación de contraseña por email** y **cambio de contraseña** desde _Mi cuenta_ (cierra las demás sesiones). |
| **Goals**     | Objetivos con fechas de inicio y fin e **hitos (milestones)**. El progreso se calcula a partir de los hitos completados. Filtros, búsqueda y borrado.                                   |
| **Tasks**     | Tareas **diarias, semanales o mensuales**, agrupadas por frecuencia. Marcar como completadas, editar, eliminar, filtrar (pendientes / completadas / vencidas) y buscar.                 |
| **Reminders** | Recordatorios con fecha y hora, tiempo restante y agrupación (hoy, mañana, esta semana…). **Notificaciones push aunque la app esté cerrada** y aviso en la pestaña abierta.             |
| **Dashboard** | KPIs globales, tasa de completado y gráficas de tareas (7 días), estado de los goals y próximos recordatorios.                                                                          |
| **Home**      | Landing pública con la presentación del producto.                                                                                                                                       |
| **Idiomas**   | Inglés y español, con fechas, plurales y tiempos relativos según el idioma.                                                                                                             |

---

## 🧱 Stack

| Capa       | Tecnología                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Frontend   | Angular 22 · standalone · signals · zoneless · `OnPush` · control flow · TypeScript 6 (`strict`)                                    |
| UI         | Bootstrap 5.3 (SCSS a medida) · Bootstrap Icons (solo los usados) · Chart.js 4                                                      |
| i18n       | `@angular/localize` (en-US de origen, traducción al español)                                                                        |
| Backend    | NestJS 12 · TypeORM · PostgreSQL 16 · JWT en cookie `HttpOnly` · `class-validator` · helmet · rate limiting · nodemailer · web-push |
| Tests      | Vitest (frontend y backend) · e2e del backend con PostgreSQL real · Playwright + axe-core (pila completa)                           |
| Calidad    | ESLint + angular-eslint (accesibilidad en plantillas) · oxlint (backend) · Prettier · husky + lint-staged                           |
| Despliegue | Docker (API y nginx con los estáticos) · `compose.prod.yaml`                                                                        |
| CI         | GitHub Actions: frontend, backend, e2e e imágenes Docker en jobs separados                                                          |

---

## 🚀 Puesta en marcha

### Requisitos

- **Node.js ≥ 22.22.3** (lo exige Angular CLI 22; ver `.nvmrc`).
- **npm 11** para el backend (`server/` fija `packageManager: npm@11`; con npm 10 `npm ci` falla). Si tu npm es anterior, usa `npx -y npm@11 ci`.
- **PostgreSQL 16**. Lo más cómodo es Docker: `docker compose up -d` crea la base de datos de la app y las de los tests (usuario y contraseña `goal`) y arranca **Mailpit**, un SMTP de pruebas cuyos emails se ven en http://localhost:8025.

### Primer arranque

```bash
git clone https://github.com/alba-alonso-dev/Goal-Planner-App-Angular.git
cd Goal-Planner-App-Angular

docker compose up -d                 # PostgreSQL en localhost:5432 y Mailpit

# Backend → http://localhost:3000/api
cd server
npx -y npm@11 ci
cp .env.example .env                 # ajusta DATABASE_URL si no usas docker compose;
                                     # SMTP_URL=smtp://localhost:1025 para ver los emails en Mailpit
npm run start:dev                    # aplica las migraciones al arrancar
cd ..

# Frontend → http://localhost:4200 (en otra terminal)
npm ci
npm start                            # ng serve redirige /api al backend (proxy.conf.json)
```

Crea una cuenta desde el botón **Login** de la barra de navegación. Para ver la interfaz en español en desarrollo: `npm run start:es`.

Sin `SMTP_URL`, los emails (recuperación de contraseña) solo se escriben en el log del backend. Para probar las **notificaciones push** en local, genera claves con `cd server && npm run vapid` y ponlas en `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (`localhost` cuenta como origen seguro).

### Variables de entorno del backend

| Variable                                 | Por defecto                     | Descripción                                                                                                      |
| ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                           | — (obligatoria)                 | Cadena de conexión de PostgreSQL.                                                                                |
| `JWT_SECRET`                             | secreto de desarrollo           | **Obligatoria en producción** (mínimo 32 caracteres): `openssl rand -base64 48`.                                 |
| `PORT`                                   | `3000`                          | Puerto HTTP.                                                                                                     |
| `SESSION_TTL_SECONDS`                    | `604800` (7 días)               | Duración de la sesión.                                                                                           |
| `AUTH_RATE_LIMIT`                        | `10`                            | Intentos de login/registro por minuto y cliente (el resto de la API: 300/min).                                   |
| `COOKIE_SECURE`                          | `true` si `NODE_ENV=production` | Enviar la cookie de sesión solo por HTTPS.                                                                       |
| `APP_URL`                                | `http://localhost:4200`         | URL pública del frontend, para los enlaces de los emails. **Obligatoria en producción.**                         |
| `SMTP_URL`                               | —                               | Servidor SMTP (`smtp://usuario:clave@host:587`). **Obligatoria en producción**; sin ella, los emails van al log. |
| `MAIL_FROM`                              | `Goal Planner <no-reply@…>`     | Remitente de los emails.                                                                                         |
| `MAIL_OUTBOX_DIR`                        | —                               | Desarrollo/tests: guarda cada email como JSON en esta carpeta.                                                   |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | —                               | Claves de Web Push (`npm run vapid`). Sin ellas, el push está desactivado.                                       |
| `VAPID_SUBJECT`                          | `mailto:admin@…`                | Contacto que se envía a los servicios de push.                                                                   |
| `PUSH_INTERVAL_SECONDS`                  | `30`                            | Cada cuánto se buscan recordatorios vencidos que notificar (0 lo desactiva).                                     |
| `TRUST_PROXY`                            | `0`                             | Proxies delante del servidor (1 detrás del nginx de Docker), para el rate limit por cliente.                     |

### Scripts del frontend (raíz)

| Comando                | Descripción                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `npm start`            | `ng serve` en inglés, con proxy de `/api` a `localhost:3000`.                                   |
| `npm run start:es`     | Lo mismo, en español.                                                                           |
| `npm run build`        | Build de producción en `dist/goal-planer/browser/{en,es}/`. Falla si falta una traducción.      |
| `npm test`             | Tests unitarios con Vitest en modo watch (`test:ci`: una sola ejecución).                       |
| `npm run e2e`          | Tests de Playwright sobre la pila completa (ver [Tests](#-tests)).                              |
| `npm run lint`         | ESLint (TypeScript, plantillas y accesibilidad).                                                |
| `npm run format`       | Formatea con Prettier (`format:check` solo comprueba).                                          |
| `npm run icons`        | Regenera `src/styles/icons.generated.css` con los iconos usados (`icons:check` solo comprueba). |
| `npm run i18n:extract` | Regenera el catálogo de textos `src/locale/messages.json`.                                      |

### Scripts del backend (`server/`)

| Comando                                      | Descripción                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `npm run start:dev`                          | Servidor con recarga.                                                |
| `npm run build` / `npm run start:prod`       | Compila a `dist/` y lo arranca.                                      |
| `npm test`                                   | Tests unitarios (Vitest).                                            |
| `npm run test:e2e`                           | Tests de la API contra PostgreSQL (`TEST_DATABASE_URL`).             |
| `npm run lint` / `npm run typecheck`         | oxlint y comprobación de tipos.                                      |
| `npm run migration:run` / `migration:revert` | Aplica o revierte migraciones a mano (al arrancar se aplican solas). |
| `npm run vapid`                              | Genera un par de claves VAPID para Web Push.                         |

---

## 🧪 Tests

| Nivel                   | Qué cubre                                                                                                                                                                                                                                         | Cómo se ejecuta                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Unitarios (frontend)    | Reglas de dominio, stores, APIs, validadores, interceptor, guard, push, y el comportamiento de los componentes (formularios, listas, diálogos, navegación) con los stores reales y un `HttpClient` de test. También con `TZ=America/Los_Angeles`. | `npm run test:ci`               |
| Unitarios (backend)     | Hash de contraseñas, validadores, reglas de goals, configuración, envío push (cifrado y firma VAPID) y la lista de servicios de push permitidos.                                                                                                  | `cd server && npm test`         |
| e2e de la API           | Registro/login/sesión, cambio y recuperación de contraseña (enlace de un solo uso, caducidad, cierre de sesiones), rate limit, CRUD de cada recurso, **aislamiento entre usuarios** (IDOR → 404) y el envío de notificaciones push.               | `cd server && npm run test:e2e` |
| e2e de la pila completa | Playwright en Chromium: flujos de auth (incluido el enlace del email), tareas, goals y recordatorios, aislamiento, el Service Worker recibiendo un push real y **axe-core (WCAG 2.1 A/AA)** en páginas y diálogos.                                | `npm run e2e`                   |

`npm run e2e` compila y arranca el backend contra `E2E_DATABASE_URL` (por defecto `goal_planner_e2e` del `docker compose`) y un `ng serve` en el puerto 4300. La primera vez instala Chromium con `npx playwright install chromium`.

### Integración continua

`.github/workflows/ci.yml` se ejecuta en cada push a `main` y en cada Pull Request, con cuatro jobs:

- **Frontend**: `lint` → `format:check` → `icons:check` → tests (dos husos horarios) → catálogo i18n al día → `build` (en + es).
- **Backend**: `npm ci` (npm 11) → `lint` → `typecheck` → tests → e2e contra un servicio PostgreSQL → `build`.
- **e2e**: Playwright contra backend + PostgreSQL + frontend; si falla, sube el informe como artefacto.
- **Docker**: construye las imágenes, levanta `compose.prod.yaml` y comprueba la API, las redirecciones de idioma y las cabeceras de seguridad.

En local, un hook de **husky** ejecuta `lint-staged` (ESLint + Prettier sobre los archivos preparados) antes de cada commit. Para ignorar en `git blame` el commit de formateo masivo: `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

---

## 🚢 Despliegue con Docker

`compose.prod.yaml` levanta la aplicación completa: PostgreSQL, la API (`server/Dockerfile`) y nginx con los estáticos de los dos idiomas y el proxy de `/api` (`Dockerfile` + `deploy/nginx.conf.template`).

```bash
cp .env.prod.example .env.prod      # rellena contraseñas, JWT_SECRET, APP_URL, SMTP_URL y (opcional) VAPID
docker compose -f compose.prod.yaml --env-file .env.prod up -d --build
```

- La aplicación queda en `http://localhost:8080` (`WEB_PORT`). En producción pon delante un proxy con **HTTPS**: la cookie de sesión es `Secure` y Web Push exige un origen seguro. Para probar en local sin HTTPS, `COOKIE_SECURE=false`.
- nginx redirige `/` (y cualquier ruta sin idioma, como el enlace del email) a `/en/` o `/es/` según el navegador, sirve cada idioma como SPA, cachea para siempre los ficheros con hash y nunca `index.html` ni el Service Worker, y añade CSP y cabeceras de seguridad.
- La API aplica las migraciones al arrancar, corre sin privilegios y tiene healthcheck; `TRUST_PROXY=1` para que el rate limit vea la IP real.
- La imagen base de Node se puede cambiar (digest fijo, mirror) con `--build-arg NODE_IMAGE=…` (variable `NODE_IMAGE` en compose).

---

## 🗂️ Estructura del proyecto

```
├── src/                          # Frontend (Angular)
│   ├── main.ts / index.html
│   ├── locale/                   # messages.json (generado) y messages.es.json (traducción)
│   ├── styles/                   # Bootstrap a medida + iconos generados
│   ├── testing/fixtures.ts       # Datos, reloj fijo y sesión de test para los specs
│   └── app/
│       ├── app.config.ts         # Zoneless, router, HttpClient + errorInterceptor, restaurar sesión, avisos
│       ├── app.routes.ts         # Layout + home; cada feature privada con loadChildren y authGuard
│       ├── core/                 # auth (+ reset-password, login-prompt), config, http (ApiError), layout, notifications (toasts, push), time
│       ├── shared/               # EntityCollection, validadores de fechas, appDialog, utils (fechas, locale)
│       └── features/
│           ├── home/ · dashboard/ · account/
│           └── tasks/ | goals/ | reminders/
│               ├── <x>.routes.ts · <x>.model.ts
│               ├── <x>-list/            # Página (contenedor)
│               ├── ui/                  # Presentación: <x>-item, <x>-details, new-<x>
│               ├── data-access/         # <x>.api.ts (HTTP) y <x>.store.ts (estado)
│               └── domain/<x>.rules.ts  # Reglas de negocio puras (+ tests)
├── server/                       # Backend (NestJS)
│   ├── src/
│   │   ├── auth/                 # Registro/login/logout/me, contraseñas (cambio y recuperación), guard de sesión, scrypt
│   │   ├── push/                 # Suscripciones Web Push y planificador de recordatorios
│   │   ├── mail/                 # Envío de emails (SMTP)
│   │   ├── tasks/ goals/ reminders/  # Entidad, DTO validado, mapper, servicio y controlador
│   │   ├── users/ · common/ · config/
│   │   └── database/             # Opciones de TypeORM, data source y migraciones SQL
│   ├── test/                     # e2e de la API (supertest + PostgreSQL)
│   ├── db-init/                  # Bases de datos de test para docker compose
│   └── Dockerfile
├── public/push-sw.js             # Service Worker (solo notificaciones push)
├── e2e/                          # Playwright (pila completa + accesibilidad)
├── docker-compose.yml            # Desarrollo: PostgreSQL + Mailpit
├── Dockerfile · deploy/          # Imagen del frontend (nginx)
├── compose.prod.yaml             # Despliegue completo
└── docs/ARCHITECTURE_REVIEW.md
```

### Rutas del frontend

| Ruta              | Componente                                  | Acceso         |
| ----------------- | ------------------------------------------- | -------------- |
| `/home`           | `HomeComponent`                             | Pública        |
| `/reset-password` | `ResetPasswordComponent` (enlace del email) | Pública        |
| `/account`        | `AccountPageComponent`                      | 🔒 Autenticado |
| `/dashboard`      | `DashboardComponent`                        | 🔒 Autenticado |
| `/goals`          | `GoalListComponent`                         | 🔒 Autenticado |
| `/tasks`          | `TaskListComponent`                         | 🔒 Autenticado |
| `/reminders`      | `ReminderListComponent`                     | 🔒 Autenticado |
| `**`              | → `/home`                                   | —              |

Cada feature privada se carga bajo demanda (`loadChildren`) y el `authGuard` se declara una sola vez en la ruta padre; Chart.js solo se descarga al abrir el dashboard y el modal de login (con `@angular/forms`) cuando se abre.

### API REST (`/api`)

| Recurso   | Endpoints                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `POST auth/register` · `POST auth/login` · `POST auth/logout` · `GET auth/me` · `POST auth/change-password` · `POST auth/forgot-password` · `POST auth/reset-password` |
| Tasks     | `GET tasks` · `GET tasks/:id` · `POST tasks` · `PUT tasks/:id` · `DELETE tasks/:id`                                                                                    |
| Goals     | `GET goals` · `GET goals/:id` · `POST goals` · `PUT goals/:id` · `DELETE goals/:id` (con sus milestones)                                                               |
| Reminders | `GET reminders` · `GET reminders/:id` · `POST reminders` · `PUT reminders/:id` · `DELETE reminders/:id`                                                                |
| Push      | `GET push/config` (clave pública VAPID) · `POST push/subscriptions` · `DELETE push/subscriptions`                                                                      |
| Salud     | `GET health`                                                                                                                                                           |

Todos los endpoints salvo `auth/register`, `auth/login`, `auth/forgot-password`, `auth/reset-password`, `push/config` y `health` requieren sesión, y el usuario sale siempre de ella: nunca se envía `userId`.

---

## 🏛️ Arquitectura

```
 features/<x>/<x>-list  (página)          ui/ (item, details, new-*)
        │  lee signals / llama acciones          ▲ input() / output()
        ▼                                        │
 data-access/<x>.store.ts ──────────────────────┘
   • EntityCollection: datos del servidor (caché por sesión)
   • vistas = domain/<x>.rules.ts (datos, ClockService.now(), locale)
   • acciones: create / update / toggle / delete (optimistas con rollback)
        │
        ▼
 data-access/<x>.api.ts ── HttpClient (fetch) + errorInterceptor ──► /api (NestJS) ──► PostgreSQL
```

**Frontend**

- **Stores por feature como fuente única de verdad** (`TaskStore`, `GoalStore`, `ReminderStore`): las páginas y el dashboard leen de ellos, así que un cambio en una pantalla se ve en todas sin volver a pedir datos. Cada lista se pide una vez por sesión; _Refresh_ en el dashboard fuerza la recarga.
- **Actualizaciones optimistas** al marcar y borrar, que se revierten (solo esa entidad) si la API falla.
- **Reglas de negocio puras** en `domain/`, probadas sin Angular y en varios husos horarios. Las fechas límite son días naturales (vencen al terminar el día).
- **Campos derivados vivos**: las vistas se calculan a partir de `ClockService.now()`, que avanza al cambiar el minuto; "vencido" o "en 2 horas" no se quedan congelados. `ReminderAlertsService` usa el mismo reloj para avisar de los recordatorios que vencen.
- **Zoneless + signals + `OnPush`** en todos los componentes, con `input()`/`output()`.
- **Sesión**: `AuthService` la restaura al arrancar con `GET /api/auth/me`; un 401 de la API cierra la sesión en el cliente y vuelve a `/home`. Al cambiar de usuario los stores se vacían y se descartan las respuestas tardías.
- **Accesibilidad**: los modales usan la directiva `appDialog` (foco atrapado, Escape, devolución del foco); el lint aplica las reglas de accesibilidad de plantillas y los e2e pasan axe-core.
- **i18n en tiempo de build**: cada idioma es un build (`/en/`, `/es/`). Los textos se marcan con `i18n` en las plantillas y con `$localize` en TS; las fechas usan `DatePipe` e `Intl` con el locale activo.
- **Web Push**: `PushService` pide permiso, suscribe el navegador con la clave VAPID del servidor y registra la suscripción; `public/push-sw.js` muestra la notificación y abre la app al pulsarla. Al cerrar sesión se da de baja la suscripción de ese navegador, y una suscripción que dejó otra persona no se hereda.

**Backend**

- **Autenticación**: JWT (HS256) en la cookie `gp_session` (`HttpOnly`, `SameSite=Strict`, `Secure` en producción, `path=/api`). Contraseñas con scrypt y sal por usuario; el login tarda lo mismo exista o no el usuario.
- **Autorización por propietario**: un guard global exige sesión (salvo rutas `@Public()`); los servicios filtran siempre por el usuario de la sesión y responden 404 ante recursos ajenos.
- **Validación en la frontera** con DTOs (`whitelist`: los campos desconocidos, como un `userId`, se descartan): fechas `YYYY-MM-DD` para días naturales y ISO 8601 con zona para los recordatorios; el orden de fechas y los hitos dentro del rango del goal se validan también en el servidor.
- **Esquema con migraciones SQL** explícitas (`synchronize` desactivado) y restricciones `CHECK` en la base de datos.
- **Endurecimiento**: helmet, rate limit global (300/min) y más estricto en login/registro y en las operaciones de contraseña.
- **Sesiones revocables**: el JWT lleva la versión de sesión del usuario (`session_version`); cambiar o restablecer la contraseña la incrementa y el guard rechaza las sesiones anteriores.
- **Recuperación de contraseña**: enlace de un solo uso que caduca en 1 hora (solo vale el último pedido); en la base de datos solo se guarda el SHA-256 del token, que se consume con un `UPDATE` condicional. La respuesta es la misma exista o no la cuenta, y el email se envía en segundo plano para que el tiempo tampoco lo delate.
- **Notificaciones push**: un planificador revisa cada 30 s los recordatorios vencidos (hasta con 1 hora de retraso) y los "reclama" con un `UPDATE` condicional, así que cada uno se envía una sola vez aunque haya varias instancias; cambiar la hora vuelve a armarlo. Solo se aceptan suscripciones de los servicios de push de los navegadores (el servidor hace peticiones a esa URL) y se borran las que el servicio da por caducadas.

---

## 🚧 Limitaciones conocidas

- 🔔 Web Push necesita HTTPS (o `localhost`) y claves VAPID; en iPhone/iPad, Safari solo permite Web Push a apps web instaladas en la pantalla de inicio (con manifest), y esta aún no lo tiene. Un recordatorio que venció hace más de una hora (por ejemplo, con el servidor parado) ya no se notifica.
- 🌐 Los mensajes de validación del backend llegan en inglés y se muestran tal cual en ambos idiomas. Cambiar de idioma recarga la app en otro subdirectorio.
- 📦 El bundle inicial pesa 515 kB (~119 kB transferidos). El runtime de i18n añade ~24 kB, así que el aviso del presupuesto está en 550 kB. Si una plantilla empieza a usar un componente o utilidad de Bootstrap excluido, hay que añadirlo en `src/styles/bootstrap.scss`.
- 📊 No se guarda cuándo se completa una tarea: la gráfica del dashboard muestra tareas creadas y con vencimiento por día.
- 👤 No se pueden editar los datos del perfil ni borrar la cuenta, y el email no se verifica al registrarse.
- 🚢 El despliegue está preparado para cualquier host con Docker, pero no para uno concreto; tampoco incluye copias de seguridad de la base de datos.

---

## 🗺️ Roadmap

Detalle y justificación en [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md#4-hoja-de-ruta-propuesta).

1. ✅ **Estabilizar**: build y tests en verde, limpieza de dependencias, CI.
2. ✅ **Fundamentos**: configuración de la API, interceptor de errores, ESLint/Prettier, `OnPush` e `input()/output()`, dashboard sin datos simulados.
3. ✅ **Arquitectura por features**: `core/ shared/ features/`, stores con signals, actualizaciones optimistas, reglas de dominio puras y validaciones de fechas.
4. ✅ **Producto y plataforma**: Angular 22 zoneless con Vitest, backend NestJS + PostgreSQL con sesión segura, e2e con Playwright, accesibilidad (diálogos, contraste, axe), i18n en/es y avisos de recordatorios.
5. ✅ **Cuenta, notificaciones y despliegue**: borrar goals, cambio y recuperación de contraseña por email, Web Push con la app cerrada, tests de comportamiento de los componentes, accesibilidad de los diálogos e imágenes Docker con nginx.
6. **Siguiente**: verificación del email y edición/borrado de la cuenta, manifest para instalar la app (PWA), copias de seguridad y observabilidad (logs estructurados, métricas).

---

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/mi-cambio`.
2. Comprueba que pasan `npm run lint`, `npm run test:ci`, `npm run build` y, si tocas el backend, `npm run lint`, `npm test` y `npm run test:e2e` en `server/`. El hook de pre-commit formatea y corrige lo que puede.
3. Abre un Pull Request describiendo el cambio.

Convenciones del proyecto:

- **Textos**: todo texto visible se marca con `i18n` (o `i18n-placeholder`, `i18n-aria-label`…) en las plantillas y con `` $localize`…` `` en TS. Después, `npm run i18n:extract` y añade la traducción en `src/locale/messages.es.json` (el build falla si falta). Usa plurales ICU en lugar de concatenar `'s'`, e `i18n="@@id"` cuando el mismo texto inglés necesite traducciones distintas.
- **Fechas**: formatos del `DatePipe` que dependan del locale (`mediumDate`, `shortTime`…) y los helpers de `shared/utils/date.ts`; nunca un locale fijo.
- Iconos: `<i aria-hidden="true" class="bi bi-<nombre>"></i>` de [Bootstrap Icons](https://icons.getbootstrap.com/); tras añadir uno nuevo, `npm run icons`.
- Código nuevo dentro de su feature (`features/<x>/`): la página en `<x>-list/`, la presentación en `ui/`, el HTTP en `data-access/<x>.api.ts`, el estado en `data-access/<x>.store.ts` y las reglas en `domain/` (con tests). Lo transversal va en `core/` y lo reutilizable en `shared/`.
- Los componentes no llaman a las APIs: usan el store de su feature. Las reglas de negocio viven en funciones puras de `domain/`, no en componentes ni stores.
- Componentes standalone, siempre con `OnPush` (lo exige ESLint); los modales, con la directiva `appDialog`.
- Backend: cada recurso con DTO validado, servicio que filtra por el usuario de la sesión y tests e2e que incluyan el acceso a datos de otro usuario. Los cambios de esquema van en una migración nueva.
- Tests de componentes: interactúa con el DOM como el usuario (`typeInto`, `clickButton`… en `src/testing/fixtures.ts`) y usa los stores reales con `provideDataTesting()` y `HttpTestingController` en lugar de mocks.

---

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE.txt) · © 2026 Alba Alonso.
