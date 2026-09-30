import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskDetailsComponent } from './task-details.component';
import { TaskStore } from '../../data-access/task.store';
import {
  clickButton,
  mockTaskResponse,
  provideDataTesting,
  signInTestUser,
  typeInto
} from '../../../../../testing/fixtures';

describe('TaskDetailsComponent', () => {
  let fixture: ComponentFixture<TaskDetailsComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;
  let store: TaskStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TaskDetailsComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    store = TestBed.inject(TaskStore);
    store.load();
    httpTesting.expectOne('/api/tasks').flush([mockTaskResponse]);

    fixture = TestBed.createComponent(TaskDetailsComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('task', store.tasks()[0]);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  /** El padre vuelve a pasar la tarea del store tras cada cambio. */
  const syncFromStore = async () => {
    fixture.componentRef.setInput('task', store.tasks()[0]);
    await fixture.whenStable();
  };

  it('shows the task', () => {
    expect(element.textContent).toContain(mockTaskResponse.taskName);
    expect(element.textContent).toContain('Pending');
    expect(element.textContent).toContain('10 days remaining');
  });

  it('edits and saves only the changed task', async () => {
    const updated = vi.fn();
    fixture.componentInstance.taskUpdated.subscribe(updated);

    clickButton(element, 'Edit');
    await fixture.whenStable();
    typeInto(element, '#task-details-taskName', 'Read the whole docs');
    await fixture.whenStable();
    clickButton(element, 'Save Changes');

    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/tasks/1' });
    expect(req.request.body.taskName).toBe('Read the whole docs');
    req.flush({ ...mockTaskResponse, taskName: 'Read the whole docs' });
    await syncFromStore();

    expect(updated).toHaveBeenCalled();
    expect(element.textContent).not.toContain('Save Changes');
    expect(element.textContent).toContain('Read the whole docs');
  });

  it('keeps the form open and shows the error when saving fails', async () => {
    clickButton(element, 'Edit');
    await fixture.whenStable();
    clickButton(element, 'Save Changes');
    httpTesting
      .expectOne({ method: 'PUT', url: '/api/tasks/1' })
      .flush({ message: 'dueDate must not be before startDate' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Validation error');
    expect(element.textContent).toContain('Save Changes');
  });

  it('marks the task as completed', async () => {
    clickButton(element, 'Mark Complete');
    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/tasks/1' });
    expect(req.request.body.isCompleted).toBe(true);
    req.flush({ ...mockTaskResponse, isCompleted: true });
    await syncFromStore();

    expect(element.textContent).toContain('Mark Pending');
  });

  it('asks before deleting and then closes', () => {
    const deleted = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.delete.subscribe(deleted);
    fixture.componentInstance.closed.subscribe(closed);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    clickButton(element, 'Delete');
    expect(deleted).toHaveBeenCalledWith(1);
    expect(closed).toHaveBeenCalled();
  });
});
