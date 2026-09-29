// Helpers de fecha compartidos. Trabajan en hora local salvo que se indique lo contrario.

const pad = (value: number) => value.toString().padStart(2, '0');

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toValidDate(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : parseDate(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return date;
}

// `new Date('YYYY-MM-DD')` se interpreta como medianoche UTC; los valores de <input type="date">
// representan un día local, así que se construyen en hora local para no desplazarlos de día.
function parseDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

/**
 * Convierte una fecha al formato ISO 8601 (UTC) que espera la API.
 * Lanza un error si la fecha no es válida, en lugar de sustituirla silenciosamente.
 */
export function toApiDate(value: string | Date): string {
  return toValidDate(value).toISOString();
}

/** `YYYY-MM-DD` en hora local, para `<input type="date">`. */
export function toDateInputValue(value: string | Date = new Date()): string {
  const date = toValidDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DDTHH:mm` en hora local, para `<input type="datetime-local">`. */
export function toDateTimeInputValue(value: string | Date = new Date()): string {
  const date = toValidDate(value);
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Devuelve una copia de la fecha a las 00:00:00.000 locales. */
export function startOfDay(value: string | Date): Date {
  const date = toValidDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Devuelve una copia de la fecha desplazada `days` días. */
export function addDays(value: string | Date, days: number): Date {
  const date = toValidDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

/** Número de días naturales (locales) de `from` a `to`; negativo si `to` es anterior. */
export function daysBetween(from: string | Date, to: string | Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}
