/** Configuración de la aplicación, leída y validada una sola vez desde las variables de entorno. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  /** Duración de la sesión en segundos. */
  sessionTtlSeconds: number;
  /** Solo enviar la cookie por HTTPS (activado por defecto en producción). */
  cookieSecure: boolean;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env['NODE_ENV'] ?? 'development';
  const production = nodeEnv === 'production';

  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (e.g. postgres://user:pass@localhost:5432/goal_planner)');
  }

  const jwtSecret = env['JWT_SECRET'] ?? (production ? undefined : DEV_JWT_SECRET);
  if (!jwtSecret || (production && jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET is required in production and must have at least 32 characters');
  }

  return {
    nodeEnv,
    port: Number(env['PORT'] ?? 3000),
    databaseUrl,
    jwtSecret,
    sessionTtlSeconds: Number(env['SESSION_TTL_SECONDS'] ?? 7 * 24 * 60 * 60),
    cookieSecure: env['COOKIE_SECURE'] ? env['COOKIE_SECURE'] === 'true' : production
  };
}
