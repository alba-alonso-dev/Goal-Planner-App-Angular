import { HttpErrorResponse } from '@angular/common/http';

/** Error normalizado que emiten todas las peticiones HTTP de la aplicación. */
export class ApiError extends Error {
  constructor(
    /** Código HTTP (0 si no hubo respuesta del servidor). */
    readonly status: number,
    /** Mensaje apto para mostrar al usuario. */
    message: string,
    /** Mensaje devuelto por el servidor, si lo hay. */
    readonly serverMessage?: string,
    /** Cuerpo original del error devuelto por el servidor. */
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Error de red: No se puede conectar al servidor',
  400: 'Error de validación: Los datos enviados no son correctos',
  401: 'No autorizado: Por favor, inicia sesión de nuevo',
  404: 'Recurso no encontrado',
  500: 'Error interno del servidor'
};

const DEFAULT_MESSAGE = 'Error connecting to the server';

export function toApiError(error: HttpErrorResponse): ApiError {
  const details = parseBody(error.error);
  return new ApiError(
    error.status,
    STATUS_MESSAGES[error.status] ?? DEFAULT_MESSAGE,
    extractServerMessage(details),
    details
  );
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function extractServerMessage(details: unknown): string | undefined {
  if (typeof details === 'string' && details.trim()) {
    return details;
  }
  if (details && typeof details === 'object') {
    const { message, title } = details as { message?: unknown; title?: unknown };
    if (typeof message === 'string' && message) return message;
    // Los errores de validación del backend (NestJS) llegan como lista de mensajes
    if (Array.isArray(message) && message.length) return message.join('. ');
    if (typeof title === 'string' && title) return title;
  }
  return undefined;
}
