import { Goal } from './goal.entity.js';

export interface MilestoneResponse {
  milestoneId: number;
  milestoneName: string;
  description: string;
  targetDate: string;
  isCompleted: boolean;
}

export interface GoalResponse {
  goalId: number;
  goalName: string;
  description: string;
  startDate: string;
  endDate: string;
  isAchieved: boolean;
  userId: number;
  milestones: MilestoneResponse[];
}

export function toGoalResponse(goal: Goal): GoalResponse {
  return {
    goalId: goal.id,
    goalName: goal.name,
    description: goal.description,
    startDate: goal.startDate,
    endDate: goal.endDate,
    isAchieved: goal.isAchieved,
    userId: goal.userId,
    milestones: [...(goal.milestones ?? [])]
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map(m => ({
        milestoneId: m.id,
        milestoneName: m.name,
        description: m.description,
        targetDate: m.targetDate,
        isCompleted: m.isCompleted
      }))
  };
}
