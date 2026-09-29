export interface MilestoneRequest {
  milestoneId: number;
  milestoneName: string;
  description: string;
  targetDate: string;
  isCompleted: boolean;
}

export interface GoalRequest {
  goalId: number;
  goalName: string;
  description: string;
  startDate: string;
  endDate: string;
  isAchieved: boolean;
  userId: number;
  milestones: MilestoneRequest[];
}

export type MilestoneResponse = MilestoneRequest;

/** Goal tal como lo devuelve la API. El listado no incluye los milestones; el detalle sí. */
export interface GoalResponse extends Omit<GoalRequest, 'milestones'> {
  milestones?: MilestoneResponse[];
  /** @deprecated Usar GoalView (se elimina al migrar a stores). */
  progress?: number;
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
export type MilestoneInput = Pick<MilestoneRequest, 'milestoneName' | 'targetDate'> &
  Partial<Pick<MilestoneRequest, 'milestoneId' | 'description' | 'isCompleted'>>;

export type GoalInput = Pick<GoalRequest, 'goalName' | 'startDate' | 'endDate'> &
  Partial<Pick<GoalRequest, 'description' | 'isAchieved'>> & {
    milestones?: MilestoneInput[];
  };
