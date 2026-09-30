import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReminderStore } from './reminder.store';
import { API_BASE_URL } from '../../../core/config/api.config';
import { mockReminderResponse, provideFixedClock, signInTestUser } from '../../../../testing/fixtures';

describe('ReminderStore', () => {
  let store: ReminderStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFixedClock(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    store = TestBed.inject(ReminderStore);

    store.load();
    httpTesting.expectOne({ method: 'GET', url: '/api/reminders' }).flush([mockReminderResponse]);
  });

  afterEach(() => httpTesting.verify());

  it('derives the time bucket from the clock', () => {
    expect(store.reminders()[0].bucket).toBe('tomorrow');
    expect(store.stats().tomorrow).toBe(1);
  });

  it('acknowledges optimistically and reverts on failure', () => {
    store.toggleAcknowledgement(1).subscribe({ error: () => undefined });
    expect(store.reminders()[0].isAcknowledged).toBe(true);

    httpTesting.expectOne('/api/reminders/1').flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.reminders()[0].isAcknowledged).toBe(false);
  });

  it('deletes without reloading the list', () => {
    store.delete(1).subscribe();
    httpTesting.expectOne('/api/reminders/1').flush({});

    expect(store.reminders()).toEqual([]);
    httpTesting.expectNone({ method: 'GET', url: '/api/reminders' });
  });
});
