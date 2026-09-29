import { GoalResponse, MilestoneResponse } from '../goal.model';
import {
  averageGoalProgress,
  goalProgress,
  goalStats,
  goalStatus,
  isGoalOverdue,
  matchesGoalSearch,
  resolveAchieved,
  selectGoals,
  toGoalView
} from './goal.rules';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const day = (y: number, m: number, d: number) => at(y, m, d, 0).toISOString();

const milestone = (isCompleted: boolean, id = 1): MilestoneResponse => ({
  milestoneId: id,
  milestoneName: `M${id}`,
  description: '',
  targetDate: day(2026, 3, 1),
  isCompleted
});

const goal = (overrides: Partial<GoalResponse> = {}): GoalResponse => ({
  goalId: 1,
  goalName: 'Aprender Angular',
  description: 'Signals y router',
  startDate: day(2026, 1, 1),
  endDate: day(2026, 6, 30),
  isAchieved: false,
  userId: 1,
  ...overrides
});

describe('goal rules', () => {
  const now = at(2026, 6, 30, 22);

  describe('goalProgress', () => {
    it('is the rounded share of completed milestones', () => {
      expect(goalProgress(goal({ milestones: [milestone(true, 1), milestone(false, 2), milestone(false, 3)] }))).toBe(
        33
      );
    });

    it('without milestones depends only on isAchieved', () => {
      expect(goalProgress(goal())).toBe(0);
      expect(goalProgress(goal({ milestones: [], isAchieved: true }))).toBe(100);
    });
  });

  describe('resolveAchieved', () => {
    it('is achieved only when every milestone is completed', () => {
      expect(resolveAchieved([{ isCompleted: true }, { isCompleted: true }], false)).toBeTrue();
      expect(resolveAchieved([{ isCompleted: true }, { isCompleted: false }], true)).toBeFalse();
    });

    it('uses the requested value when there are no milestones', () => {
      expect(resolveAchieved([], true)).toBeTrue();
      expect(resolveAchieved([], false)).toBeFalse();
    });
  });

  describe('overdue and status', () => {
    it('is not overdue on its target day, and is from the next day', () => {
      expect(isGoalOverdue(goal(), now)).toBeFalse();
      expect(isGoalOverdue(goal(), at(2026, 7, 1, 0))).toBeTrue();
    });

    it('an achieved goal is never overdue', () => {
      expect(isGoalOverdue(goal({ isAchieved: true, endDate: day(2020, 1, 1) }), now)).toBeFalse();
    });

    it('assigns exactly one status, with achieved and overdue taking precedence', () => {
      expect(goalStatus(goal({ isAchieved: true }), now)).toBe('completed');
      expect(goalStatus(goal({ endDate: day(2026, 6, 1), milestones: [milestone(true)] }), now)).toBe('overdue');
      expect(goalStatus(goal({ milestones: [milestone(true, 1), milestone(false, 2)] }), now)).toBe('inProgress');
      expect(goalStatus(goal(), now)).toBe('notStarted');
    });
  });

  describe('views and stats', () => {
    const views = [
      goal({ goalId: 1, isAchieved: true }),
      goal({ goalId: 2, milestones: [milestone(true, 1), milestone(false, 2)] }),
      goal({ goalId: 3, endDate: day(2026, 1, 1) })
    ].map(g => toGoalView(g, now));

    it('derives milestones, progress, days remaining and status', () => {
      expect(views[1]).toEqual(
        jasmine.objectContaining({ progress: 50, daysRemaining: 0, isOverdue: false, status: 'inProgress' })
      );
      expect(toGoalView(goal(), now).milestones).toEqual([]);
    });

    it('splits goals into completed, active and overdue without overlap', () => {
      expect(goalStats(views)).toEqual({ total: 3, completed: 1, active: 1, overdue: 1 });
    });

    it('averages progress', () => {
      expect(averageGoalProgress(views)).toBe(50); // (100 + 50 + 0) / 3
      expect(averageGoalProgress([])).toBe(0);
    });

    it('filters and searches', () => {
      expect(selectGoals(views, { filter: 'active', search: '' }).map(g => g.goalId)).toEqual([2]);
      expect(selectGoals(views, { filter: 'overdue', search: '' }).map(g => g.goalId)).toEqual([3]);
      expect(selectGoals(views, { filter: 'completed', search: '' }).map(g => g.goalId)).toEqual([1]);
      expect(matchesGoalSearch(goal(), 'ROUTER')).toBeTrue();
      expect(matchesGoalSearch(goal(), 'python')).toBeFalse();
    });
  });
});
