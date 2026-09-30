import { GoalApi } from './goal.api';
import { mockGoalResponse } from '../../../../testing/fixtures';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('GoalApi', () => {
  let api: GoalApi;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    api = TestBed.inject(GoalApi);
  });

  it('derives isAchieved from the milestones when there are any', () => {
    const allDone = mockGoalResponse.milestones!.map(m => ({ ...m, isCompleted: true }));

    expect(api.toRequest(1, { ...mockGoalResponse, milestones: allDone, isAchieved: false }, 1).isAchieved).toBe(true);
    // Desmarcar un milestone vuelve a abrir el goal aunque estuviera conseguido
    expect(api.toRequest(1, { ...mockGoalResponse, isAchieved: true }, 1).isAchieved).toBe(false);
  });

  it('respects the requested value when there are no milestones', () => {
    expect(api.toRequest(1, { ...mockGoalResponse, milestones: [], isAchieved: true }, 1).isAchieved).toBe(true);
  });

  it('sends 0 as id for new milestones and keeps existing ids', () => {
    const request = api.toRequest(
      1,
      {
        ...mockGoalResponse,
        milestones: [...mockGoalResponse.milestones!, { milestoneName: ' Nuevo ', targetDate: '2026-07-01' }]
      },
      1
    );

    expect(request.milestones.map(m => m.milestoneId)).toEqual([1, 2, 0]);
    expect(request.milestones[2]).toEqual(
      expect.objectContaining({ milestoneName: 'Nuevo', isCompleted: false, description: '' })
    );
  });
});
