import { IsBoolean, IsISO8601, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../common/validation.js';

/** Cuerpo para crear o reemplazar (PUT) un recordatorio. */
export class ReminderDto {
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Instante ISO 8601 con hora y zona (p. ej. 2026-06-10T16:45:00.000Z): sin zona sería ambiguo. */
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/, {
    message: 'reminderDateTime must include a time and a time zone (e.g. 2026-06-10T16:45:00.000Z)'
  })
  reminderDateTime!: string;

  @IsOptional()
  @IsBoolean()
  isAcknowledged?: boolean;
}
