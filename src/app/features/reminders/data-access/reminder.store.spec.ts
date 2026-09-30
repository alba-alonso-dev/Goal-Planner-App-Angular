import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReminderStore } from './reminder.store';
import { API_BASE_URL } from '../../../core/config/api.config';
import { loginTestUser, mockReminderResponse, provideFixedClock } from '../../../../testing/fixtures';

describe('ReminderStore', () => {
  let store: ReminderStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    loginTestUser();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideFixedClock(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    store = TestBed.inject(ReminderStore);
    httpTesting = TestBed.inject(HttpTestingController);

    store.load();
    httpTesting.expectOne(r => r.url === '/api/getReminders').flush([mockReminderResponse]);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('derives the time bucket from the clock', () => {
    expect(store.reminders()[0].bucket).toBe('tomorrow');
    expect(store.stats().tomorrow).toBe(1);
  });

  it('acknowledges optimistically and reverts on failure', () => {
    store.toggleAcknowledgement(1).subscribe({ error: () => undefined });
    expect(store.reminders()[0].isAcknowledged).toBe(true);

    httpTesting.expectOne('/api/updateReminder/1').flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.reminders()[0].isAcknowledged).toBe(false);
  });

  it('deletes without reloading the list', () => {
    store.delete(1).subscribe();
    httpTesting.expectOne('/api/deleteReminder/1').flush({});

    expect(store.reminders()).toEqual([]);
    httpTesting.expectNone(r => r.url === '/api/getReminders');
  });
});
