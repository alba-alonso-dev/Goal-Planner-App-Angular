import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { DashboardService } from './dashboard.service';
import { mockGoal, mockReminder, mockTask } from '../../testing/fixtures';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(DashboardService);
  });

  it('should not load data on construction', () => {
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('should only report overdue items, using their real dates, with stable ids', () => {
    const due = '2026-01-10T10:00:00.000Z';
    service.tasks.set([
      { ...mockTask, taskId: 1, isOverdue: true, dueDate: due },
      { ...mockTask, taskId: 2, isCompleted: true }
    ]);
    service.goals.set([{ ...mockGoal, isAchieved: true }]);
    service.reminders.set([{ ...mockReminder, isAcknowledged: true }]);

    const first = service.recentActivity();
    service.tasks.set([...service.tasks()]);
    const second = service.recentActivity();

    expect(first.length).toBe(1);
    expect(first[0].timestamp.toISOString()).toBe(due);
    expect(second.map(a => a.id)).toEqual(first.map(a => a.id));
  });

  it('should not mutate the tasks signal when sorting recent tasks', () => {
    const tasks = [
      { ...mockTask, taskId: 1, dueDate: '2026-01-01T00:00:00.000Z' },
      { ...mockTask, taskId: 2, dueDate: '2026-06-01T00:00:00.000Z' }
    ];
    service.tasks.set(tasks);

    expect(service.getRecentTasks(5).map(t => t.taskId)).toEqual([2, 1]);
    expect(service.tasks().map(t => t.taskId)).toEqual([1, 2]);
  });

  it('should bucket task chart data by local calendar day', () => {
    const today = new Date();
    today.setHours(0, 30, 0, 0);
    service.tasks.set([{ ...mockTask, createdDate: today.toISOString(), dueDate: today.toISOString() }]);

    const data = service.getTaskChartData();

    expect(data.labels.length).toBe(7);
    expect(data.datasets[0].data[6]).toBe(1);
    expect(data.datasets[1].data[6]).toBe(1);
  });
});
