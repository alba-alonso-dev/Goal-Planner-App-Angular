import type { CookieOptions } from 'express';
import { AppConfig } from '../config/app-config.js';

export const SESSION_COOKIE = 'gp_session';

/**
 * Cookie de sesión: HttpOnly (JavaScript no puede leerla, lo que limita el impacto de un XSS) y
 * SameSite=Strict (el navegador no la envía en peticiones iniciadas desde otros sitios: protección CSRF).
 */
export function sessionCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/api',
    maxAge: config.sessionTtlSeconds * 1000
  };
}
