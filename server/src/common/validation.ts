import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** true si es una fecha real con formato YYYY-MM-DD (rechaza, p. ej., 2026-02-30). */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Valida un día natural `YYYY-MM-DD` (los campos de fecha sin hora). */
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: { message: `${String(propertyKey)} must be a date in YYYY-MM-DD format`, ...options },
      validator: { validate: isDateOnly }
    });
}

/** Recorta espacios de los strings (los demás valores pasan tal cual). */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Las fechas YYYY-MM-DD se comparan correctamente como texto. */
export function assertDateOrder(start: string, end: string, message: string): void {
  if (end < start) throw new BadRequestException(message);
}
