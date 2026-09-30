import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskApi } from './task.api';
import { mockTaskResponse } from '../../../../testing/fixtures';

describe('TaskApi', () => {
  let api: TaskApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(TaskApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists the tasks of the session user without sending any userId', () => {
    let result: unknown;
    api.getAll().subscribe(tasks => (result = tasks));

    const req = httpTesting.expectOne('/api/tasks');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([mockTaskResponse]);
    expect(result).toEqual([mockTaskResponse]);
  });

  it('sends only the editable fields, trimmed, with date-only values', () => {
    api
      .update(7, {
        ...mockTaskResponse,
        taskName: '  Leer  ',
        startDate: '2026-06-01',
        dueDate: new Date(2026, 5, 5, 23, 30).toISOString()
      })
      .subscribe();

    const req = httpTesting.expectOne('/api/tasks/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      taskName: 'Leer',
      description: '',
      frequency: 'Daily',
      startDate: '2026-06-01',
      dueDate: '2026-06-05',
      isCompleted: false
    });
    req.flush(mockTaskResponse);
  });

  it('emits an error instead of sending a request when a date is invalid', () => {
    let captured: unknown;

    api.create({ ...mockTaskResponse, dueDate: 'not a date' }).subscribe({ error: (e: unknown) => (captured = e) });

    expect(captured instanceof Error).toBe(true);
    httpTesting.expectNone('/api/tasks');
  });

  it('deletes by id', () => {
    api.delete(3).subscribe();
    expect(httpTesting.expectOne('/api/tasks/3').request.method).toBe('DELETE');
  });
});
