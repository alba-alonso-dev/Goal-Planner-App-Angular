import { GoalApi } from './goal.api';
import { mockGoalResponse } from '../../../../testing/fixtures';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('GoalApi', () => {
  let api: GoalApi;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(GoalApi);
  });

  it('derives isAchieved from the milestones when there are any', () => {
    const allDone = mockGoalResponse.milestones!.map(m => ({ ...m, isCompleted: true }));

    expect(api.toBody({ ...mockGoalResponse, milestones: allDone, isAchieved: false }).isAchieved).toBe(true);
    // Desmarcar un milestone vuelve a abrir el goal aunque estuviera conseguido
    expect(api.toBody({ ...mockGoalResponse, isAchieved: true }).isAchieved).toBe(false);
  });

  it('respects the requested value when there are no milestones', () => {
    expect(api.toBody({ ...mockGoalResponse, milestones: [], isAchieved: true }).isAchieved).toBe(true);
  });

  it('sends 0 as id for new milestones and keeps existing ids', () => {
    const request = api.toBody({
      ...mockGoalResponse,
      milestones: [...mockGoalResponse.milestones!, { milestoneName: ' Nuevo ', targetDate: '2026-07-01' }]
    });

    expect(request.milestones.map((m: { milestoneId: number }) => m.milestoneId)).toEqual([1, 2, 0]);
    expect(request.milestones[2]).toEqual(
      expect.objectContaining({ milestoneName: 'Nuevo', isCompleted: false, description: '' })
    );
  });
});
