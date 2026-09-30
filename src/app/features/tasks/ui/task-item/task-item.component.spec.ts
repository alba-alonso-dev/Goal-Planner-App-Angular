import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskItemComponent } from './task-item.component';
import { TaskView } from '../../task.model';
import { toTaskView } from '../../domain/task.rules';
import { clickButton, FIXED_NOW, mockTask, mockTaskResponse } from '../../../../../testing/fixtures';

describe('TaskItemComponent', () => {
  let fixture: ComponentFixture<TaskItemComponent>;
  let element: HTMLElement;

  const render = async (task: TaskView = mockTask) => {
    fixture.componentRef.setInput('task', task);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TaskItemComponent] });
    fixture = TestBed.createComponent(TaskItemComponent);
    element = fixture.nativeElement;
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the task, its frequency and the days left', async () => {
    await render();
    expect(element.textContent).toContain(mockTask.taskName);
    expect(element.textContent).toContain('Daily');
    expect(element.textContent).toContain('10 days remaining');
  });

  it('says when a task is overdue, in singular or plural', async () => {
    await render(toTaskView({ ...mockTaskResponse, dueDate: '2026-06-09' }, FIXED_NOW));
    expect(element.textContent).toContain('Overdue by 1 day');
    await render(toTaskView({ ...mockTaskResponse, dueDate: '2026-06-07' }, FIXED_NOW));
    expect(element.textContent).toContain('Overdue by 3 days');
  });

  it('emits toggle, details and delete (after confirming)', async () => {
    await render();
    const toggled = vi.fn();
    const details = vi.fn();
    const deleted = vi.fn();
    fixture.componentInstance.toggleCompletion.subscribe(toggled);
    fixture.componentInstance.viewDetails.subscribe(details);
    fixture.componentInstance.delete.subscribe(deleted);

    element.querySelector<HTMLInputElement>(`[aria-label="Mark ${mockTask.taskName} as completed"]`)!.click();
    clickButton(element, 'View Details');
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    element.querySelector<HTMLButtonElement>('[aria-label="Delete task"]')!.click();
    element.querySelector<HTMLButtonElement>('[aria-label="Delete task"]')!.click();

    expect(toggled).toHaveBeenCalledWith(mockTask);
    expect(details).toHaveBeenCalledWith(mockTask);
    expect(deleted).toHaveBeenCalledTimes(1);
    expect(deleted).toHaveBeenCalledWith(mockTask.taskId);
  });
});
