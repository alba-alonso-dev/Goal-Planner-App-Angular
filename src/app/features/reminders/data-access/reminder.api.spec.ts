import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReminderApi } from './reminder.api';
import { API_BASE_URL } from '../../../core/config/api.config';
import { mockReminderResponse } from '../../../../testing/fixtures';

describe('ReminderApi', () => {
  let api: ReminderApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }]
    });
    api = TestBed.inject(ReminderApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends a datetime-local value as the matching UTC instant', () => {
    api.create({ title: 'Llamar', description: '', reminderDateTime: '2026-06-10T18:45' }).subscribe();

    const req = httpTesting.expectOne('/api/reminders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Llamar',
      description: '',
      isAcknowledged: false,
      reminderDateTime: new Date(2026, 5, 10, 18, 45).toISOString()
    });
    req.flush(mockReminderResponse);
  });

  it('deletes by id', () => {
    api.delete(3).subscribe();
    expect(httpTesting.expectOne('/api/reminders/3').request.method).toBe('DELETE');
  });
});
