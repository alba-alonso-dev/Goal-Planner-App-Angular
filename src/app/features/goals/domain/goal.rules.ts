import { daysBetween } from '../../../shared/utils/date';
import {
  GoalFilter,
  GoalResponse,
  GoalStats,
  GoalStatus,
  GoalView,
  MilestoneInput,
  MilestoneResponse
} from '../goal.model';

// Reglas de negocio de los goals. Funciones puras: todo lo que depende del tiempo recibe `now`.

export function goalProgress(goal: Pick<GoalResponse, 'isAchieved' | 'milestones'>): number {
  const milestones = goal.milestones ?? [];
  if (milestones.length === 0) return goal.isAchieved ? 100 : 0;
  return Math.round((milestones.filter(m => m.isCompleted).length / milestones.length) * 100);
}

/**
 * Un goal con milestones está conseguido si, y solo si, todos lo están (así, desmarcar un milestone
 * lo vuelve a abrir). Sin milestones, manda lo que indique el usuario.
 */
export function resolveAchieved(
  milestones: readonly Pick<MilestoneInput, 'isCompleted'>[],
  requested: boolean
): boolean {
  return milestones.length > 0 ? milestones.every(m => m.isCompleted === true) : requested;
}

/** La fecha objetivo es un día (sin hora): el goal vence al terminar ese día. */
export function isGoalOverdue(goal: Pick<GoalResponse, 'isAchieved' | 'endDate'>, now: Date): boolean {
  return !goal.isAchieved && daysBetween(now, goal.endDate) < 0;
}

export function goalStatus(goal: GoalResponse, now: Date): GoalStatus {
  if (goal.isAchieved) return 'completed';
  if (isGoalOverdue(goal, now)) return 'overdue';
  return goalProgress(goal) > 0 ? 'inProgress' : 'notStarted';
}

export function toGoalView(goal: GoalResponse, now: Date): GoalView {
  const milestones: MilestoneResponse[] = goal.milestones ?? [];
  return {
    ...goal,
    description: goal.description || '',
    milestones,
    progress: goalProgress(goal),
    daysRemaining: daysBetween(now, goal.endDate),
    isOverdue: isGoalOverdue(goal, now),
    status: goalStatus(goal, now)
  };
}

export function goalStats(goals: readonly GoalView[]): GoalStats {
  const completed = goals.filter(g => g.isAchieved).length;
  const overdue = goals.filter(g => g.isOverdue).length;
  return { total: goals.length, completed, overdue, active: goals.length - completed - overdue };
}

/** Media del progreso de todos los goals (0 si no hay ninguno). */
export function averageGoalProgress(goals: readonly GoalView[]): number {
  return goals.length ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;
}

export function matchesGoalFilter(goal: GoalView, filter: GoalFilter): boolean {
  switch (filter) {
    case 'active':
      return !goal.isAchieved && !goal.isOverdue;
    case 'completed':
      return goal.isAchieved;
    case 'overdue':
      return goal.isOverdue;
    default:
      return true;
  }
}

export function matchesGoalSearch(goal: GoalResponse, search: string): boolean {
  const term = search.trim().toLowerCase();
  return !term || goal.goalName.toLowerCase().includes(term) || goal.description?.toLowerCase().includes(term);
}

export function selectGoals(goals: readonly GoalView[], options: { filter: GoalFilter; search: string }): GoalView[] {
  return goals.filter(g => matchesGoalFilter(g, options.filter) && matchesGoalSearch(g, options.search));
}
