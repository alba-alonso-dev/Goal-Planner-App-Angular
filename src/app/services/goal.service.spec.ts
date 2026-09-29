import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GoalService } from './goal.service';
import { API_BASE_URL } from '../core/config/api.config';
import { GoalResponse } from '../model/goal';
import { mockGoal } from '../../testing/fixtures';

describe('GoalService', () => {
  let service: GoalService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ userId: 42, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api' }]
    });
    service = TestBed.inject(GoalService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('should enrich a small list of goals with their details before emitting', () => {
    let result: GoalResponse[] | undefined;

    service.getAllGoalsByUser().subscribe(goals => (result = goals));

    httpTesting.expectOne(r => r.url === '/api/getAllGoalsByUser').flush([{ ...mockGoal, milestones: [] }]);
    expect(result).toBeUndefined();

    httpTesting.expectOne(`/api/getGoal/${mockGoal.goalId}`).flush(mockGoal);
    expect(result?.[0].progress).toBe(50);
  });

  it('should emit an empty list when the user has no goals', () => {
    let result: GoalResponse[] | undefined;

    service.getAllGoalsByUser().subscribe(goals => (result = goals));
    httpTesting.expectOne(r => r.url === '/api/getAllGoalsByUser').flush([]);

    expect(result).toEqual([]);
  });

  it('should mark the goal as achieved when every milestone is completed', () => {
    service
      .updateGoalWithMilestones(mockGoal.goalId, {
        ...mockGoal,
        milestones: mockGoal.milestones!.map(m => ({ ...m, isCompleted: true }))
      })
      .subscribe();

    const req = httpTesting.expectOne(`/api/updateGoalWithMilestones/${mockGoal.goalId}`);
    expect(req.request.body.isAchieved).toBeTrue();
    req.flush({});
  });
});
