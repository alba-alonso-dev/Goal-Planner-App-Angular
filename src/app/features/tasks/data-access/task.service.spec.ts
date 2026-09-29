import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskService } from './task.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiError } from '../../../core/http/api-error';
import { mockTask } from '../../../../testing/fixtures';

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;

  const login = () =>
    localStorage.setItem('user', JSON.stringify({ userId: 42, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }]
    });
    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => localStorage.removeItem('user'));
  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('should fail with a 401 ApiError and no request when not logged in', () => {
    setup();
    let captured: unknown;

    service.getAllTasksByUser().subscribe({ error: e => (captured = e) });

    expect(captured instanceof ApiError).toBeTrue();
    expect((captured as ApiError).status).toBe(401);
  });

  it('should load the tasks of the logged user and compute derived fields', () => {
    login();
    setup();
    let result: unknown[] = [];

    service.getAllTasksByUser().subscribe(tasks => (result = tasks));

    const req = httpTesting.expectOne(r => r.url === '/api/getAllTasks');
    expect(req.request.params.get('userId')).toBe('42');
    req.flush([{ ...mockTask, isCompleted: true }]);

    expect(result.length).toBe(1);
    expect((result[0] as typeof mockTask).progress).toBe(100);
  });

  it('should toggle completion with a single PUT using the task it already has', () => {
    login();
    setup();

    service.toggleTaskCompletion(mockTask).subscribe();

    const req = httpTesting.expectOne(`/api/updateTask/${mockTask.taskId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.isCompleted).toBeTrue();
    expect(req.request.body.userId).toBe(42);
    req.flush({});
  });

  it('should emit an error instead of sending a request when a date is invalid', () => {
    login();
    setup();
    let captured: unknown;

    service.createTask({ ...mockTask, dueDate: 'not a date' }).subscribe({ error: e => (captured = e) });

    expect(captured instanceof Error).toBeTrue();
    httpTesting.expectNone('/api/createTask');
  });
});
