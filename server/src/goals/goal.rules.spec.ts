import { BadRequestException } from '@nestjs/common';
import { GoalDto } from './dto/goal.dto.js';
import { assertValidGoalDates, resolveAchieved } from './goal.rules.js';

describe('goal rules', () => {
  it('derives achievement from milestones when there are any', () => {
    expect(resolveAchieved([{ isCompleted: true }, { isCompleted: true }], false)).toBe(true);
    expect(resolveAchieved([{ isCompleted: true }, { isCompleted: false }], true)).toBe(false);
    expect(resolveAchieved([], true)).toBe(true);
  });

  const goal = (overrides: Partial<GoalDto> = {}): GoalDto => ({
    goalName: 'Goal',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    milestones: [{ milestoneName: 'M', targetDate: '2026-06-15' }],
    ...overrides
  });

  it('accepts dates in order with milestones inside the range (inclusive)', () => {
    expect(() => assertValidGoalDates(goal())).not.toThrow();
    expect(() =>
      assertValidGoalDates(
        goal({
          milestones: [
            { milestoneName: 'A', targetDate: '2026-06-01' },
            { milestoneName: 'B', targetDate: '2026-06-30' }
          ]
        })
      )
    ).not.toThrow();
  });

  it('rejects an end date before the start date and milestones outside the range', () => {
    expect(() => assertValidGoalDates(goal({ endDate: '2026-05-31', milestones: [] }))).toThrow(BadRequestException);
    expect(() =>
      assertValidGoalDates(goal({ milestones: [{ milestoneName: 'Late', targetDate: '2026-07-01' }] }))
    ).toThrow(/Late/);
  });
});
