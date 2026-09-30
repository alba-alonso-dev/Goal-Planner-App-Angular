import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalDetailsComponent } from './goal-details.component';
import { GoalStore } from '../../data-access/goal.store';
import {
  clickButton,
  mockGoalResponse,
  provideDataTesting,
  signInTestUser,
  typeInto
} from '../../../../../testing/fixtures';

describe('GoalDetailsComponent', () => {
  let fixture: ComponentFixture<GoalDetailsComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;
  let store: GoalStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [GoalDetailsComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    store = TestBed.inject(GoalStore);
    store.load();
    httpTesting.expectOne('/api/goals').flush([mockGoalResponse]);

    fixture = TestBed.createComponent(GoalDetailsComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('goal', store.goals()[0]);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  const syncFromStore = async () => {
    fixture.componentRef.setInput('goal', store.goals()[0]);
    await fixture.whenStable();
  };

  const milestoneRow = (name: string) =>
    [...element.querySelectorAll<HTMLElement>('[role="button"]')].find(row => row.textContent?.includes(name))!;

  it('completes a milestone with a click and recalculates the progress', async () => {
    milestoneRow('Router').click();
    await syncFromStore();
    expect(element.textContent).toContain('100%');

    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/goals/1' });
    expect(req.request.body.isAchieved).toBe(true);
    req.flush({ ...mockGoalResponse, isAchieved: true, milestones: req.request.body.milestones });
  });

  it('can also be toggled with the keyboard', async () => {
    milestoneRow('Router').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    httpTesting.expectOne({ method: 'PUT', url: '/api/goals/1' }).flush(mockGoalResponse);
  });

  it('edits the goal and saves it', async () => {
    const updated = vi.fn();
    fixture.componentInstance.goalUpdated.subscribe(updated);
    clickButton(element, 'Edit Goal');
    await fixture.whenStable();
    typeInto(element, '#goal-details-goalName', 'Master Angular');
    await fixture.whenStable();
    clickButton(element, 'Save Changes');

    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/goals/1' });
    expect(req.request.body.goalName).toBe('Master Angular');
    req.flush({ ...mockGoalResponse, goalName: 'Master Angular' });
    await syncFromStore();
    expect(updated).toHaveBeenCalled();
  });

  it('asks before deleting', () => {
    const deleted = vi.fn();
    fixture.componentInstance.delete.subscribe(deleted);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    clickButton(element, 'Delete');
    expect(deleted).not.toHaveBeenCalled();
  });
});
