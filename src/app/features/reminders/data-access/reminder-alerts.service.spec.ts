import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ReminderAlertsService } from './reminder-alerts.service';
import { ClockService } from '../../../core/time/clock.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { mockReminderResponse, signInTestUser } from '../../../../testing/fixtures';

describe('ReminderAlertsService', () => {
  const start = new Date(2026, 5, 10, 9, 0);
  const now = signal(start);
  let httpTesting: HttpTestingController;
  let warning: ReturnType<typeof vi.fn>;

  const at = (h: number, m: number) => new Date(2026, 5, 10, h, m).toISOString();

  beforeEach(() => {
    now.set(start);
    warning = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ClockService, useValue: { now: now.asReadonly() } },
        { provide: NotificationService, useValue: { warning } }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    TestBed.inject(ReminderAlertsService);
    TestBed.tick();
    httpTesting.expectOne({ method: 'GET', url: '/api/reminders' }).flush([
      { ...mockReminderResponse, reminderId: 1, title: 'Ya vencido', reminderDateTime: at(8, 30) },
      { ...mockReminderResponse, reminderId: 2, title: 'A las 9:05', reminderDateTime: at(9, 5) },
      { ...mockReminderResponse, reminderId: 3, title: 'Reconocido', reminderDateTime: at(9, 5), isAcknowledged: true },
      { ...mockReminderResponse, reminderId: 4, title: 'A las 10:00', reminderDateTime: at(10, 0) }
    ]);
    TestBed.tick();
  });

  afterEach(() => httpTesting.verify());

  it('loads the reminders when a user is signed in and does not alert about already overdue ones', () => {
    expect(warning).not.toHaveBeenCalled();
  });

  it('alerts once when a pending reminder becomes due', () => {
    now.set(new Date(2026, 5, 10, 9, 5));
    TestBed.tick();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][1]).toContain('A las 9:05');

    now.set(new Date(2026, 5, 10, 9, 6));
    TestBed.tick();
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('catches up with every reminder due since the last check', () => {
    now.set(new Date(2026, 5, 10, 10, 30));
    TestBed.tick();
    expect(warning.mock.calls.map(c => c[1])).toEqual(['⏰ A las 9:05', '⏰ A las 10:00']);
  });
});
