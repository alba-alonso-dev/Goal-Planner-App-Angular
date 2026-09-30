import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskStore } from './task.store';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { loginTestUser, mockTaskResponse, provideFixedClock } from '../../../../testing/fixtures';

describe('TaskStore', () => {
  let store: TaskStore;
  let httpTesting: HttpTestingController;

  const second = { ...mockTaskResponse, taskId: 2, taskName: 'Segunda' };
  const listRequest = () => httpTesting.expectOne(r => r.url === '/api/getAllTasks');
  const loadWith = (tasks = [mockTaskResponse, second]) => {
    store.load();
    listRequest().flush(tasks);
  };

  beforeEach(() => {
    loginTestUser();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFixedClock(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    store = TestBed.inject(TaskStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  describe('load', () => {
    it('exposes views with derived fields and stats', () => {
      loadWith([{ ...mockTaskResponse, dueDate: new Date(2026, 5, 1).toISOString() }]);

      expect(store.tasks()[0].isOverdue).toBe(true);
      expect(store.stats()).toEqual({ total: 1, completed: 0, pending: 0, overdue: 1 });
      expect(store.loading()).toBe(false);
    });

    it('does not request again once loaded, unless forced', () => {
      loadWith();

      store.load();
      httpTesting.expectNone(r => r.url === '/api/getAllTasks');

      store.load({ force: true });
      listRequest().flush([]);
      expect(store.tasks()).toEqual([]);
    });

    it('exposes the error message when loading fails', () => {
      store.load();
      listRequest().flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.error()).toBeTruthy();
      expect(store.loading()).toBe(false);
    });
  });

  describe('optimistic updates', () => {
    beforeEach(() => loadWith());

    it('toggles completion immediately with a single PUT', () => {
      store.toggleCompletion(1).subscribe();

      expect(store.tasks()[0].isCompleted).toBe(true);
      const req = httpTesting.expectOne('/api/updateTask/1');
      expect(req.request.body.isCompleted).toBe(true);
      req.flush({});
      expect(store.tasks()[0].isCompleted).toBe(true);
    });

    it('rolls back only the failed task', () => {
      let failed = false;
      store.toggleCompletion(1).subscribe({ error: () => (failed = true) });
      store.toggleCompletion(2).subscribe();

      httpTesting.expectOne('/api/updateTask/2').flush({});
      httpTesting.expectOne('/api/updateTask/1').flush(null, { status: 500, statusText: 'Server Error' });

      expect(failed).toBe(true);
      expect(store.tasks().map(t => t.isCompleted)).toEqual([false, true]);
    });

    it('removes immediately and restores the task in place if the API fails', () => {
      store.delete(1).subscribe({ error: () => undefined });
      expect(store.tasks().map(t => t.taskId)).toEqual([2]);

      httpTesting.expectOne('/api/deleteTask/1').flush(null, { status: 500, statusText: 'Server Error' });
      expect(store.tasks().map(t => t.taskId)).toEqual([1, 2]);
    });
  });

  describe('create and update', () => {
    beforeEach(() => loadWith());

    it('inserts the created task without reloading the list', () => {
      store
        .create({
          taskName: 'Nueva',
          description: '',
          frequency: 'Weekly',
          startDate: '2026-06-10',
          dueDate: '2026-06-17'
        })
        .subscribe();

      httpTesting.expectOne('/api/createTask').flush({ ...mockTaskResponse, taskId: 9, taskName: 'Nueva' });
      expect(store.tasks().map(t => t.taskId)).toEqual([1, 2, 9]);
    });

    it('reloads the list if the API does not return the created task', () => {
      store
        .create({
          taskName: 'Nueva',
          description: '',
          frequency: 'Daily',
          startDate: '2026-06-10',
          dueDate: '2026-06-10'
        })
        .subscribe();

      httpTesting.expectOne('/api/createTask').flush(null);
      listRequest().flush([mockTaskResponse]);
      expect(store.tasks().length).toBe(1);
    });

    it('replaces only the edited task after a successful update', () => {
      store.update(2, { ...second, taskName: 'Editada' }).subscribe();
      expect(store.tasks()[1].taskName).toBe('Segunda'); // no es optimista

      httpTesting.expectOne('/api/updateTask/2').flush({});
      expect(store.tasks()[1].taskName).toBe('Editada');
    });
  });

  describe('session changes', () => {
    it('clears the data when the user logs out', () => {
      loadWith();

      TestBed.inject(AuthService).logout();
      TestBed.flushEffects();

      expect(store.tasks()).toEqual([]);
    });

    it('ignores a response that arrives after the user logged out', () => {
      store.load();
      const pending = listRequest();

      TestBed.inject(AuthService).logout();
      TestBed.flushEffects();
      pending.flush([mockTaskResponse]);

      expect(store.tasks()).toEqual([]);
    });
  });
});
