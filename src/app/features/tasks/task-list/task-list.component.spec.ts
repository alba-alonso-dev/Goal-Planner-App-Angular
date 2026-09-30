import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskListComponent } from './task-list.component';
import { TaskResponse } from '../task.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import {
  clickButton,
  mockTaskResponse,
  provideDataTesting,
  signInTestUser,
  typeInto
} from '../../../../testing/fixtures';

const TASKS: TaskResponse[] = [
  { ...mockTaskResponse, taskId: 1, taskName: 'Buy bread', frequency: 'Daily' },
  { ...mockTaskResponse, taskId: 2, taskName: 'Weekly report', frequency: 'Weekly', isCompleted: true },
  { ...mockTaskResponse, taskId: 3, taskName: 'Pay the rent', frequency: 'Monthly', dueDate: '2026-06-05' }
];

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TaskListComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    fixture = TestBed.createComponent(TaskListComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
    httpTesting.expectOne('/api/tasks').flush(TASKS);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  const shows = (name: string) => element.textContent!.includes(name);

  it('groups the tasks by frequency', () => {
    expect(shows('Buy bread')).toBe(true);
    expect(shows('Weekly report')).toBe(true);
    expect(shows('Pay the rent')).toBe(true);
    expect(element.querySelectorAll('app-task-item')).toHaveLength(3);
  });

  it('filters by status', async () => {
    clickButton(element, 'Completed');
    await fixture.whenStable();
    expect(element.querySelectorAll('app-task-item')).toHaveLength(1);
    expect(shows('Weekly report')).toBe(true);

    clickButton(element, 'Overdue');
    await fixture.whenStable();
    expect(element.querySelectorAll('app-task-item')).toHaveLength(1);
    expect(shows('Pay the rent')).toBe(true);
  });

  it('searches by name', async () => {
    typeInto(element, 'input[placeholder="Search tasks..."]', 'bread');
    await fixture.whenStable();
    expect(element.querySelectorAll('app-task-item')).toHaveLength(1);
    expect(shows('Buy bread')).toBe(true);
  });

  it('creates a task from the dialog and adds it without reloading the list', async () => {
    clickButton(element, 'New Task');
    await fixture.whenStable();
    typeInto(element, '#new-task-taskName', 'Water the plants');
    await fixture.whenStable();
    clickButton(element, 'Create Task');

    const req = httpTesting.expectOne({ method: 'POST', url: '/api/tasks' });
    req.flush({ ...mockTaskResponse, taskId: 4, taskName: 'Water the plants' });
    await fixture.whenStable();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(element.querySelectorAll('app-task-item')).toHaveLength(4);
    httpTesting.expectNone('/api/tasks');
  });

  it('deletes a task after confirming and reports it', async () => {
    const success = vi.spyOn(TestBed.inject(NotificationService), 'success');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    element.querySelector<HTMLButtonElement>('app-task-item [aria-label="Delete task"]')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('app-task-item')).toHaveLength(2);

    httpTesting.expectOne({ method: 'DELETE', url: '/api/tasks/1' }).flush(null);
    expect(success).toHaveBeenCalled();
  });
});
