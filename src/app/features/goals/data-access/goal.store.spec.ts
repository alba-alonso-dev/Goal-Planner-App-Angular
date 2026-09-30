import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GoalStore } from './goal.store';
import { mockGoalResponse, provideFixedClock, signInTestUser } from '../../../../testing/fixtures';

describe('GoalStore', () => {
  let store: GoalStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideFixedClock()]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    store = TestBed.inject(GoalStore);
  });

  afterEach(() => httpTesting.verify());

  const loadGoal = () => {
    store.load();
    httpTesting.expectOne({ method: 'GET', url: '/api/goals' }).flush([mockGoalResponse]);
  };

  it('loads goals with their milestones in a single request', () => {
    loadGoal();

    expect(store.goals()[0].progress).toBe(50);
    httpTesting.expectNone('/api/goals/1');
  });

  it('handles a user with no goals', () => {
    store.load();
    httpTesting.expectOne('/api/goals').flush([]);
    expect(store.goals()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('toggles a milestone optimistically and marks the goal achieved when all are done', () => {
    loadGoal();

    store.toggleMilestone(1, 2).subscribe();

    expect(store.goals()[0].progress).toBe(100);
    expect(store.goals()[0].isAchieved).toBe(true);
    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/goals/1' });
    expect(req.request.body.isAchieved).toBe(true);
    req.flush({ ...mockGoalResponse, isAchieved: true });
  });

  it('reverts a milestone toggle if the API fails', () => {
    loadGoal();

    store.toggleMilestone(1, 2).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/goals/1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.goals()[0].progress).toBe(50);
    expect(store.goals()[0].isAchieved).toBe(false);
  });

  it('applies the goal returned by the server after an update (with new milestone ids)', () => {
    loadGoal();
    const withNewMilestone = {
      ...mockGoalResponse,
      milestones: [
        ...mockGoalResponse.milestones!,
        { milestoneId: 3, milestoneName: 'Forms', description: '', targetDate: '2026-07-01', isCompleted: false }
      ]
    };

    store
      .update(1, {
        ...mockGoalResponse,
        milestones: [...mockGoalResponse.milestones!, { milestoneName: 'Forms', targetDate: '2026-07-01' }]
      })
      .subscribe();
    httpTesting.expectOne({ method: 'PUT', url: '/api/goals/1' }).flush(withNewMilestone);

    expect(store.goals()[0].milestones.map(m => m.milestoneId)).toEqual([1, 2, 3]);
  });

  it('inserts the created goal without reloading the list', () => {
    loadGoal();

    store.create({ goalName: 'Nuevo', startDate: '2026-07-01', endDate: '2026-07-31' }).subscribe();
    httpTesting
      .expectOne({ method: 'POST', url: '/api/goals' })
      .flush({ ...mockGoalResponse, goalId: 2, goalName: 'Nuevo', milestones: [] });

    expect(store.goals().map(g => g.goalId)).toEqual([1, 2]);
    httpTesting.expectNone({ method: 'GET', url: '/api/goals' });
  });

  it('removes a goal immediately and deletes it with a single DELETE', () => {
    loadGoal();
    store.delete(mockGoalResponse.goalId).subscribe();
    expect(store.goals()).toEqual([]);

    httpTesting.expectOne({ method: 'DELETE', url: `/api/goals/${mockGoalResponse.goalId}` }).flush(null);
    expect(store.goals()).toEqual([]);
  });

  it('restores the goal if the delete fails', () => {
    loadGoal();
    store.delete(mockGoalResponse.goalId).subscribe({ error: () => undefined });

    httpTesting
      .expectOne(`/api/goals/${mockGoalResponse.goalId}`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.goals().map(g => g.goalId)).toEqual([mockGoalResponse.goalId]);
  });
});
