import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsDateOnly, Trim } from '../../common/validation.js';
import { TASK_FREQUENCIES, type TaskFrequency } from '../task.entity.js';

/** Cuerpo para crear o reemplazar (PUT) una tarea. Los campos desconocidos (p. ej. userId) se ignoran. */
export class TaskDto {
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  taskName!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(TASK_FREQUENCIES)
  frequency!: TaskFrequency;

  @IsDateOnly()
  startDate!: string;

  @IsDateOnly()
  dueDate!: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
