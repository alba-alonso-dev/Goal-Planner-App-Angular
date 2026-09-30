import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskApi } from './task.api';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiError } from '../../../core/http/api-error';
import { loginTestUser, mockTaskResponse } from '../../../../testing/fixtures';

describe('TaskApi', () => {
  let api: TaskApi;
  let httpTesting: HttpTestingController;

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }]
    });
    api = TestBed.inject(TaskApi);
    httpTesting = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => localStorage.removeItem('user'));
  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('fails with a 401 ApiError and sends nothing when not logged in', () => {
    setup();
    let captured: unknown;

    api.getAll().subscribe({ error: (e: unknown) => (captured = e) });

    expect(captured instanceof ApiError).toBeTrue();
    expect((captured as ApiError).status).toBe(401);
  });

  it('loads the tasks of the logged user', () => {
    loginTestUser();
    setup();
    let result: unknown;

    api.getAll().subscribe(tasks => (result = tasks));

    const req = httpTesting.expectOne(r => r.url === '/api/getAllTasks');
    expect(req.request.params.get('userId')).toBe('1');
    req.flush([mockTaskResponse]);
    expect(result).toEqual([mockTaskResponse]);
  });

  it('sends the full task with trimmed text and ISO dates on update', () => {
    loginTestUser();
    setup();

    api
      .update(7, { ...mockTaskResponse, taskName: '  Leer  ', startDate: '2026-06-01', dueDate: '2026-06-05' })
      .subscribe();

    const req = httpTesting.expectOne('/api/updateTask/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        taskId: 7,
        userId: 1,
        taskName: 'Leer',
        startDate: new Date(2026, 5, 1).toISOString(),
        dueDate: new Date(2026, 5, 5).toISOString()
      })
    );
    req.flush({});
  });

  it('emits an error instead of sending a request when a date is invalid', () => {
    loginTestUser();
    setup();
    let captured: unknown;

    api.create({ ...mockTaskResponse, dueDate: 'not a date' }).subscribe({ error: (e: unknown) => (captured = e) });

    expect(captured instanceof Error).toBeTrue();
    httpTesting.expectNone('/api/createTask');
  });
});
