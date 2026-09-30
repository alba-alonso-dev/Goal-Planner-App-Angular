import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GoalStore } from './goal.store';
import { API_BASE_URL } from '../../../core/config/api.config';
import { GoalResponse } from '../goal.model';
import { loginTestUser, mockGoalResponse, provideFixedClock } from '../../../../testing/fixtures';

describe('GoalStore', () => {
  let store: GoalStore;
  let httpTesting: HttpTestingController;

  const withoutMilestones = ({ milestones: _m, ...goal }: GoalResponse): GoalResponse => goal;

  beforeEach(() => {
    loginTestUser();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideFixedClock(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    store = TestBed.inject(GoalStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  const loadGoal = () => {
    store.load();
    httpTesting.expectOne(r => r.url === '/api/getAllGoalsByUser').flush([withoutMilestones(mockGoalResponse)]);
    httpTesting.expectOne('/api/getGoal/1').flush(mockGoalResponse);
  };

  it('loads the details of a small list before exposing it', () => {
    store.load();
    httpTesting.expectOne(r => r.url === '/api/getAllGoalsByUser').flush([withoutMilestones(mockGoalResponse)]);
    expect(store.goals()).toEqual([]);

    httpTesting.expectOne('/api/getGoal/1').flush(mockGoalResponse);
    expect(store.goals()[0].progress).toBe(50);
  });

  it('handles a user with no goals', () => {
    store.load();
    httpTesting.expectOne(r => r.url === '/api/getAllGoalsByUser').flush([]);
    expect(store.goals()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('toggles a milestone optimistically and marks the goal achieved when all are done', () => {
    loadGoal();

    store.toggleMilestone(1, 2).subscribe();

    expect(store.goals()[0].progress).toBe(100);
    expect(store.goals()[0].isAchieved).toBe(true);
    const req = httpTesting.expectOne('/api/updateGoalWithMilestones/1');
    expect(req.request.body.isAchieved).toBe(true);
    req.flush({});
  });

  it('reopens an achieved goal when a milestone is unticked', () => {
    loadGoal();
    store.toggleMilestone(1, 2).subscribe();
    httpTesting.expectOne('/api/updateGoalWithMilestones/1').flush({});

    store.toggleMilestone(1, 1).subscribe();

    expect(store.goals()[0].isAchieved).toBe(false);
    httpTesting.expectOne('/api/updateGoalWithMilestones/1').flush({});
  });

  it('reverts a milestone toggle if the API fails', () => {
    loadGoal();

    store.toggleMilestone(1, 2).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/updateGoalWithMilestones/1').flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.goals()[0].progress).toBe(50);
    expect(store.goals()[0].isAchieved).toBe(false);
  });

  it('refreshes only the edited goal after an update (to get new milestone ids)', () => {
    loadGoal();

    store.update(1, { ...mockGoalResponse, goalName: 'Editado' }).subscribe();
    httpTesting.expectOne('/api/updateGoalWithMilestones/1').flush({});
    httpTesting.expectOne('/api/getGoal/1').flush({ ...mockGoalResponse, goalName: 'Editado' });

    expect(store.goals()[0].goalName).toBe('Editado');
  });
});
