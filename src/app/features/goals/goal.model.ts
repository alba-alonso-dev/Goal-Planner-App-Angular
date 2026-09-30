export interface MilestoneResponse {
  milestoneId: number;
  milestoneName: string;
  description: string;
  /** Día natural `YYYY-MM-DD`. */
  targetDate: string;
  isCompleted: boolean;
}

/** Goal tal como lo devuelve la API (listado y detalle incluyen los milestones). */
export interface GoalResponse {
  goalId: number;
  goalName: string;
  description: string;
  /** Días naturales `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  isAchieved: boolean;
  userId: number;
  milestones?: MilestoneResponse[];
}

/** Estado excluyente de un goal, usado en filtros y gráficas. */
export type GoalStatus = 'completed' | 'overdue' | 'inProgress' | 'notStarted';

/** Goal con los campos derivados que usa la interfaz (dependen de la fecha actual). */
export interface GoalView extends GoalResponse {
  milestones: MilestoneResponse[];
  /** Porcentaje de milestones completados (100 si está conseguido y no tiene milestones). */
  progress: number;
  /** Días naturales hasta la fecha objetivo (negativo si ya pasó). */
  daysRemaining: number;
  isOverdue: boolean;
  status: GoalStatus;
}

export interface GoalStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
}

export type GoalFilter = 'all' | 'active' | 'completed' | 'overdue';

// Datos que aportan los formularios para crear/actualizar un goal
export type MilestoneInput = Pick<MilestoneResponse, 'milestoneName' | 'targetDate'> &
  Partial<Pick<MilestoneResponse, 'milestoneId' | 'description' | 'isCompleted'>>;

export type GoalInput = Pick<GoalResponse, 'goalName' | 'startDate' | 'endDate'> &
  Partial<Pick<GoalResponse, 'description' | 'isAchieved'>> & {
    milestones?: MilestoneInput[];
  };
