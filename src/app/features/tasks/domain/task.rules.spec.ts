import { TaskResponse } from '../task.model';
import {
  daysUntilDue,
  isTaskOverdue,
  matchesTaskFilter,
  matchesTaskSearch,
  selectTasks,
  sortTasks,
  taskStats,
  toTaskView
} from './task.rules';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const day = (y: number, m: number, d: number) => at(y, m, d, 0).toISOString();

const task = (overrides: Partial<TaskResponse> = {}): TaskResponse => ({
  taskId: 1,
  taskName: 'Leer',
  description: 'Documentación de Angular',
  frequency: 'Daily',
  createdDate: day(2026, 1, 1),
  startDate: day(2026, 1, 1),
  dueDate: day(2026, 1, 10),
  isCompleted: false,
  userId: 1,
  ...overrides
});

describe('task rules', () => {
  const now = at(2026, 1, 10, 18, 30);

  describe('overdue / days remaining', () => {
    it('is not overdue on its due day, even late in the day', () => {
      expect(daysUntilDue(task(), now)).toBe(0);
      expect(isTaskOverdue(task(), now)).toBeFalse();
    });

    it('is overdue from the next calendar day', () => {
      expect(isTaskOverdue(task(), at(2026, 1, 11, 0, 1))).toBeTrue();
      expect(daysUntilDue(task(), at(2026, 1, 13))).toBe(-3);
    });

    it('counts calendar days until the due date', () => {
      expect(daysUntilDue(task({ dueDate: day(2026, 1, 17) }), now)).toBe(7);
    });

    it('is never overdue once completed', () => {
      expect(isTaskOverdue(task({ isCompleted: true, dueDate: day(2025, 1, 1) }), now)).toBeFalse();
    });
  });

  describe('toTaskView', () => {
    it('derives progress, days remaining and overdue state', () => {
      const view = toTaskView(task({ dueDate: day(2026, 1, 8) }), now);
      expect(view).toEqual(jasmine.objectContaining({ progress: 0, daysRemaining: -2, isOverdue: true }));
      expect(toTaskView(task({ isCompleted: true }), now).progress).toBe(100);
    });

    it('normalizes a missing description', () => {
      expect(toTaskView(task({ description: null as unknown as string }), now).description).toBe('');
    });
  });

  describe('taskStats', () => {
    it('splits tasks into completed, pending and overdue without overlap', () => {
      const views = [
        task({ taskId: 1, isCompleted: true }),
        task({ taskId: 2 }),
        task({ taskId: 3, dueDate: day(2026, 1, 1) })
      ].map(t => toTaskView(t, now));

      expect(taskStats(views)).toEqual({ total: 3, completed: 1, pending: 1, overdue: 1 });
    });

    it('handles an empty list', () => {
      expect(taskStats([])).toEqual({ total: 0, completed: 0, pending: 0, overdue: 0 });
    });
  });

  describe('filters and search', () => {
    const pending = toTaskView(task({ taskId: 1 }), now);
    const done = toTaskView(task({ taskId: 2, isCompleted: true }), now);
    const late = toTaskView(task({ taskId: 3, dueDate: day(2026, 1, 1) }), now);

    it('applies each status filter', () => {
      const all = [pending, done, late];
      expect(all.filter(t => matchesTaskFilter(t, 'all')).length).toBe(3);
      expect(all.filter(t => matchesTaskFilter(t, 'pending'))).toEqual([pending]);
      expect(all.filter(t => matchesTaskFilter(t, 'completed'))).toEqual([done]);
      expect(all.filter(t => matchesTaskFilter(t, 'overdue'))).toEqual([late]);
    });

    it('searches name and description case-insensitively, ignoring surrounding spaces', () => {
      expect(matchesTaskSearch(task(), '  LEER ')).toBeTrue();
      expect(matchesTaskSearch(task(), 'angular')).toBeTrue();
      expect(matchesTaskSearch(task(), 'python')).toBeFalse();
      expect(matchesTaskSearch(task(), '')).toBeTrue();
    });
  });

  describe('sorting and selection', () => {
    it('puts pending tasks first, then sorts by due date, without mutating the input', () => {
      const input = [
        task({ taskId: 1, isCompleted: true, dueDate: day(2026, 1, 1) }),
        task({ taskId: 2, dueDate: day(2026, 1, 20) }),
        task({ taskId: 3, dueDate: day(2026, 1, 5) })
      ];
      expect(sortTasks(input).map(t => t.taskId)).toEqual([3, 2, 1]);
      expect(input.map(t => t.taskId)).toEqual([1, 2, 3]);
    });

    it('combines frequency, status filter and search', () => {
      const views = [
        task({ taskId: 1, frequency: 'Daily' }),
        task({ taskId: 2, frequency: 'Weekly' }),
        task({ taskId: 3, frequency: 'Daily', taskName: 'Correr', description: '' })
      ].map(t => toTaskView(t, now));

      expect(selectTasks(views, { frequency: 'Daily', filter: 'all', search: '' }).map(t => t.taskId)).toEqual([1, 3]);
      expect(selectTasks(views, { frequency: 'Daily', filter: 'pending', search: 'corr' }).map(t => t.taskId)).toEqual([
        3
      ]);
    });
  });
});
