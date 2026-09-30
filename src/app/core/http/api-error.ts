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
  0: $localize`Network error: the server cannot be reached`,
  400: $localize`Validation error: the submitted data is not valid`,
  401: $localize`Not authorized: please log in again`,
  404: $localize`Resource not found`,
  500: $localize`Internal server error`
};

const DEFAULT_MESSAGE = $localize`Error connecting to the server`;

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
