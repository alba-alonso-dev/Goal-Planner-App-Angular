import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalItemComponent } from './goal-item.component';
import { toGoalView } from '../../domain/goal.rules';
import { clickButton, FIXED_NOW, mockGoal, mockGoalResponse } from '../../../../../testing/fixtures';

describe('GoalItemComponent', () => {
  let fixture: ComponentFixture<GoalItemComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [GoalItemComponent] });
    fixture = TestBed.createComponent(GoalItemComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('goal', mockGoal);
    await fixture.whenStable();
  });

  it('shows the progress from its milestones', () => {
    const bar = element.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(element.textContent).toContain('50%');
    expect(element.textContent).toContain('2 milestones');
  });

  it('uses the singular for one milestone', async () => {
    fixture.componentRef.setInput(
      'goal',
      toGoalView({ ...mockGoalResponse, milestones: mockGoalResponse.milestones!.slice(0, 1) }, FIXED_NOW)
    );
    await fixture.whenStable();
    expect(element.textContent).toContain('1 milestone');
    expect(element.textContent).not.toContain('1 milestones');
  });

  it('opens the details', () => {
    const details = vi.fn();
    fixture.componentInstance.viewDetails.subscribe(details);
    clickButton(element, 'View Details');
    expect(details).toHaveBeenCalledWith(mockGoal);
  });
});
