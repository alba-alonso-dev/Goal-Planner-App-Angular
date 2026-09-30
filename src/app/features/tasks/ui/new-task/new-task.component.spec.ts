import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTaskComponent } from './new-task.component';
import { TaskInput } from '../../task.model';
import { clickButton, findButton, selectOption, typeInto } from '../../../../../testing/fixtures';

describe('NewTaskComponent', () => {
  let fixture: ComponentFixture<NewTaskComponent>;
  let element: HTMLElement;
  let created: TaskInput[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NewTaskComponent] });
    fixture = TestBed.createComponent(NewTaskComponent);
    element = fixture.nativeElement;
    created = [];
    fixture.componentInstance.taskCreated.subscribe(task => created.push(task));
    await fixture.whenStable();
  });

  it('emits the task with the values typed in the form', async () => {
    typeInto(element, '#new-task-taskName', 'Water the plants');
    selectOption(element, '#new-task-frequency', 'Weekly');
    typeInto(element, '#new-task-startDate', '2026-06-01');
    typeInto(element, '#new-task-dueDate', '2026-06-08');
    typeInto(element, '#new-task-description', 'Balcony');
    await fixture.whenStable();
    clickButton(element, 'Create Task');

    expect(created).toEqual([
      {
        taskName: 'Water the plants',
        frequency: 'Weekly',
        startDate: '2026-06-01',
        dueDate: '2026-06-08',
        description: 'Balcony'
      }
    ]);
  });

  it('requires a title of at least 3 characters', async () => {
    typeInto(element, '#new-task-taskName', 'ab');
    await fixture.whenStable();

    expect(findButton(element, 'Create Task').disabled).toBe(true);
    expect(element.textContent).toContain('Task title is required (minimum 3 characters)');
  });

  it('does not allow a due date before the start date', async () => {
    typeInto(element, '#new-task-taskName', 'Water the plants');
    typeInto(element, '#new-task-startDate', '2026-06-10');
    typeInto(element, '#new-task-dueDate', '2026-06-09');
    await fixture.whenStable();

    expect(findButton(element, 'Create Task').disabled).toBe(true);
    expect(element.textContent).toContain('Due date cannot be before start date');
  });

  it('shows the progress and blocks the buttons while the parent saves', async () => {
    fixture.componentRef.setInput('submitting', true);
    await fixture.whenStable();

    expect(element.textContent).toContain('Creating...');
    expect(findButton(element, 'Cancel').disabled).toBe(true);
  });

  it('closes with Cancel', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    clickButton(element, 'Cancel');
    expect(closed).toHaveBeenCalled();
  });
});
