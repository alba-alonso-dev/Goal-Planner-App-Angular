import { BadRequestException } from '@nestjs/common';
import { assertDateOrder } from '../common/validation.js';
import { GoalDto } from './dto/goal.dto.js';

/**
 * Misma regla que el frontend: con milestones, el goal está conseguido si y solo si todos lo están;
 * sin milestones, manda lo que indique el usuario.
 */
export function resolveAchieved(milestones: readonly { isCompleted?: boolean }[], requested: boolean): boolean {
  return milestones.length > 0 ? milestones.every(m => m.isCompleted === true) : requested;
}

/** Fechas del goal ordenadas y milestones dentro de su intervalo. */
export function assertValidGoalDates(dto: GoalDto): void {
  assertDateOrder(dto.startDate, dto.endDate, 'endDate cannot be before startDate');
  const outOfRange = (dto.milestones ?? []).filter(m => m.targetDate < dto.startDate || m.targetDate > dto.endDate);
  if (outOfRange.length) {
    throw new BadRequestException(
      `Milestone target dates must be between startDate and endDate: ${outOfRange.map(m => m.milestoneName).join(', ')}`
    );
  }
}
