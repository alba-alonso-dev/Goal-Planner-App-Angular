import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalListComponent } from './goal-list.component';
import { GoalResponse } from '../goal.model';
import {
  clickButton,
  mockGoalResponse,
  provideDataTesting,
  signInTestUser,
  typeInto
} from '../../../../testing/fixtures';

const done = mockGoalResponse.milestones!.map(m => ({ ...m, isCompleted: true }));
const GOALS: GoalResponse[] = [
  mockGoalResponse,
  { ...mockGoalResponse, goalId: 2, goalName: 'Run a marathon', milestones: done, isAchieved: true },
  { ...mockGoalResponse, goalId: 3, goalName: 'Read 12 books', endDate: '2026-05-31', milestones: [] }
];

describe('GoalListComponent', () => {
  let fixture: ComponentFixture<GoalListComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [GoalListComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    fixture = TestBed.createComponent(GoalListComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
    httpTesting.expectOne('/api/goals').flush(GOALS);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  const shown = () =>
    ['Aprender Angular', 'Run a marathon', 'Read 12 books'].filter(n => element.textContent!.includes(n));

  it('filters by status and searches by name', async () => {
    expect(shown()).toHaveLength(3);

    clickButton(element, 'Completed');
    await fixture.whenStable();
    expect(shown()).toEqual(['Run a marathon']);

    clickButton(element, 'Overdue');
    await fixture.whenStable();
    expect(shown()).toEqual(['Read 12 books']);

    clickButton(element, 'All');
    typeInto(element, 'input[placeholder="Search goals..."]', 'angular');
    await fixture.whenStable();
    expect(shown()).toEqual(['Aprender Angular']);
  });

  it('deletes a goal from its details and closes the dialog', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    clickButton(element, 'View Details');
    await fixture.whenStable();
    clickButton(element.querySelector('[role="dialog"]')!, 'Delete');
    await fixture.whenStable();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(shown()).toHaveLength(2);
    httpTesting.expectOne({ method: 'DELETE', url: '/api/goals/1' }).flush(null);
  });
});
