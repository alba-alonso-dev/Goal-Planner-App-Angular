export interface DashboardStats {
  // Tasks
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };

  // Goals
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  overdueGoals: number;
  averageGoalProgress: number;

  // Reminders
  totalReminders: number;
  acknowledgedReminders: number;
  pendingReminders: number;
  overdueReminders: number;
  remindersByTime: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    later: number;
  };

  // Combined
  completionRate: number;
  totalItems: number;
  activeItems: number;
  overdueItems: number;
}

export interface RecentActivity {
  id: string;
  type: 'task' | 'goal' | 'reminder';
  action: 'created' | 'completed' | 'updated' | 'acknowledged' | 'overdue';
  title: string;
  timestamp: Date;
  icon: string;
  color: string;
  link?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }[];
}

export interface TaskCompletionData {
  date: string;
  completed: number;
  created: number;
}
