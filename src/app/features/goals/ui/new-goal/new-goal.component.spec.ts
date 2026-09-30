import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewGoalComponent } from './new-goal.component';
import { GoalInput } from '../../goal.model';
import { clickButton, findButton, typeInto } from '../../../../../testing/fixtures';

describe('NewGoalComponent', () => {
  let fixture: ComponentFixture<NewGoalComponent>;
  let element: HTMLElement;
  let created: GoalInput[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NewGoalComponent] });
    fixture = TestBed.createComponent(NewGoalComponent);
    element = fixture.nativeElement;
    created = [];
    fixture.componentInstance.goalCreated.subscribe(goal => created.push(goal));
    await fixture.whenStable();
  });

  const fillGoal = async () => {
    typeInto(element, '#new-goal-goalName', 'Run a marathon');
    typeInto(element, '#new-goal-startDate', '2026-06-01');
    typeInto(element, '#new-goal-endDate', '2026-10-31');
    await fixture.whenStable();
  };

  it('emits the goal with its milestones', async () => {
    await fillGoal();
    clickButton(element, 'Add Milestone');
    await fixture.whenStable();
    typeInto(element, '#new-goal-milestone-0-milestoneName', 'Half marathon');
    typeInto(element, '#new-goal-milestone-0-targetDate', '2026-08-15');
    await fixture.whenStable();
    clickButton(element, 'Create Goal');

    expect(created).toEqual([
      {
        goalName: 'Run a marathon',
        description: '',
        startDate: '2026-06-01',
        endDate: '2026-10-31',
        milestones: [{ milestoneName: 'Half marathon', targetDate: '2026-08-15', description: '' }]
      }
    ]);
  });

  it('keeps milestones inside the goal dates', async () => {
    await fillGoal();
    clickButton(element, 'Add Milestone');
    await fixture.whenStable();
    typeInto(element, '#new-goal-milestone-0-milestoneName', 'Too late');
    typeInto(element, '#new-goal-milestone-0-targetDate', '2026-12-01');
    await fixture.whenStable();

    expect(findButton(element, 'Create Goal').disabled).toBe(true);
    expect(element.textContent).toContain('Must be between the goal start and target dates');
  });

  it('removes a milestone', async () => {
    await fillGoal();
    clickButton(element, 'Add Milestone');
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('[aria-label="Remove milestone"]')!.click();
    await fixture.whenStable();

    expect(element.querySelector('#new-goal-milestone-0-milestoneName')).toBeNull();
  });

  it('does not allow the target date before the start date', async () => {
    await fillGoal();
    typeInto(element, '#new-goal-endDate', '2026-05-01');
    await fixture.whenStable();

    expect(findButton(element, 'Create Goal').disabled).toBe(true);
    expect(element.textContent).toContain('Target date cannot be before start date');
  });
});
