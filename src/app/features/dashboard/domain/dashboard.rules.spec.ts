import { toGoalView } from '../../goals/domain/goal.rules';
import { GoalResponse } from '../../goals/goal.model';
import { toReminderView } from '../../reminders/domain/reminder.rules';
import { ReminderResponse } from '../../reminders/reminder.model';
import { toTaskView } from '../../tasks/domain/task.rules';
import { TaskResponse } from '../../tasks/task.model';
import {
  dashboardStats,
  goalStatusChart,
  needsAttention,
  taskActivityChart,
  upcomingRemindersChart,
  upcomingTasks
} from './dashboard.rules';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const now = at(2026, 6, 10, 15);

const task = (id: number, overrides: Partial<TaskResponse> = {}) =>
  toTaskView(
    {
      taskId: id,
      taskName: `T${id}`,
      description: '',
      frequency: 'Daily',
      createdDate: at(2026, 6, 10, 9).toISOString(),
      startDate: at(2026, 6, 1, 0).toISOString(),
      dueDate: at(2026, 6, 12, 0).toISOString(),
      isCompleted: false,
      userId: 1,
      ...overrides
    },
    now
  );

const goal = (id: number, overrides: Partial<GoalResponse> = {}) =>
  toGoalView(
    {
      goalId: id,
      goalName: `G${id}`,
      description: '',
      startDate: at(2026, 1, 1, 0).toISOString(),
      endDate: at(2026, 12, 31, 0).toISOString(),
      isAchieved: false,
      userId: 1,
      ...overrides
    },
    now
  );

const reminder = (id: number, when: Date, overrides: Partial<ReminderResponse> = {}) =>
  toReminderView(
    {
      reminderId: id,
      title: `R${id}`,
      description: '',
      reminderDateTime: when.toISOString(),
      isAcknowledged: false,
      userId: 1,
      ...overrides
    },
    now
  );

describe('dashboard rules', () => {
  const tasks = [
    task(1),
    task(2, { isCompleted: true, frequency: 'Weekly' }),
    task(3, { dueDate: at(2026, 6, 1, 0).toISOString() })
  ];
  const goals = [
    goal(1, { isAchieved: true }),
    goal(2),
    goal(3, { endDate: at(2026, 5, 1, 0).toISOString() }),
    goal(4, {
      milestones: [
        { milestoneId: 1, milestoneName: 'a', description: '', targetDate: '', isCompleted: true },
        { milestoneId: 2, milestoneName: 'b', description: '', targetDate: '', isCompleted: false }
      ]
    })
  ];
  const reminders = [
    reminder(1, at(2026, 6, 10, 9)), // vencido
    reminder(2, at(2026, 6, 10, 20)), // hoy
    reminder(3, at(2026, 6, 13, 9)), // esta semana
    reminder(4, at(2026, 6, 10, 20), { isAcknowledged: true })
  ];

  it('aggregates stats consistently with each feature', () => {
    const stats = dashboardStats(tasks, goals, reminders);

    expect(stats).toEqual(
      expect.objectContaining({
        totalTasks: 3,
        completedTasks: 1,
        pendingTasks: 1,
        overdueTasks: 1,
        tasksByFrequency: { daily: 2, weekly: 1, monthly: 0 },
        totalGoals: 4,
        completedGoals: 1,
        activeGoals: 2,
        overdueGoals: 1,
        averageGoalProgress: 38, // (100 + 0 + 0 + 50) / 4 = 37.5
        totalReminders: 4,
        acknowledgedReminders: 1,
        pendingReminders: 2,
        overdueReminders: 1,
        remindersByTime: { today: 1, tomorrow: 0, thisWeek: 1, later: 0 },
        totalItems: 11,
        completionRate: 27, // 3 de 11
        activeItems: 5,
        overdueItems: 3
      })
    );
  });

  it('handles no data', () => {
    expect(dashboardStats([], [], []).completionRate).toBe(0);
  });

  it('goal chart counts each goal once', () => {
    const data = goalStatusChart(goals).datasets[0].data;
    expect(data).toEqual([1, 1, 1, 1]);
    expect(data.reduce((a, b) => a + b, 0)).toBe(goals.length);
  });

  it('reminder chart only counts upcoming pending reminders', () => {
    expect(upcomingRemindersChart(reminders).datasets[0].data).toEqual([1, 0, 1, 0]);
  });

  it('task activity chart buckets the last 7 local days, today last', () => {
    const chart = taskActivityChart(tasks, now);
    expect(chart.labels.length).toBe(7);
    expect(chart.datasets[1].data).toEqual([0, 0, 0, 0, 0, 0, 3]); // las 3 creadas hoy
    expect(chart.datasets[0].data.reduce((a, b) => a + b, 0)).toBe(0); // ninguna vence en esos 7 días
  });

  it('lists overdue items with their real dates, most recent first, with stable ids', () => {
    const items = needsAttention(tasks, goals, reminders);
    expect(items.map(i => i.id)).toEqual(['reminder-overdue-1', 'task-overdue-3', 'goal-overdue-3']);
    expect(needsAttention(tasks, goals, reminders)).toEqual(items);
    expect(needsAttention(tasks, goals, reminders, 1).length).toBe(1);
  });

  it('upcoming tasks lists pending first, by due date', () => {
    expect(upcomingTasks(tasks, 2).map(t => t.taskId)).toEqual([3, 1]);
  });
});
