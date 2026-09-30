import { addDays, daysBetween, startOfDay } from '../../../shared/utils/date';
import { averageGoalProgress, goalStats } from '../../goals/domain/goal.rules';
import { GoalStatus, GoalView } from '../../goals/goal.model';
import { reminderStats } from '../../reminders/domain/reminder.rules';
import { ReminderView } from '../../reminders/reminder.model';
import { sortTasks, taskStats } from '../../tasks/domain/task.rules';
import { TaskView } from '../../tasks/task.model';
import { ChartData, DashboardStats, RecentActivity } from '../dashboard.model';

// Cálculos del dashboard a partir de las vistas de cada feature. Funciones puras.

export function dashboardStats(tasks: TaskView[], goals: GoalView[], reminders: ReminderView[]): DashboardStats {
  const t = taskStats(tasks);
  const g = goalStats(goals);
  const r = reminderStats(reminders);

  const totalItems = t.total + g.total + r.total;
  const completedItems = t.completed + g.completed + r.acknowledged;

  return {
    totalTasks: t.total,
    completedTasks: t.completed,
    pendingTasks: t.pending,
    overdueTasks: t.overdue,
    tasksByFrequency: {
      daily: tasks.filter(task => task.frequency === 'Daily').length,
      weekly: tasks.filter(task => task.frequency === 'Weekly').length,
      monthly: tasks.filter(task => task.frequency === 'Monthly').length
    },

    totalGoals: g.total,
    completedGoals: g.completed,
    activeGoals: g.active,
    overdueGoals: g.overdue,
    averageGoalProgress: averageGoalProgress(goals),

    totalReminders: r.total,
    acknowledgedReminders: r.acknowledged,
    pendingReminders: r.pending,
    overdueReminders: r.overdue,
    remindersByTime: { today: r.today, tomorrow: r.tomorrow, thisWeek: r.thisWeek, later: r.later },

    completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    totalItems,
    activeItems: t.pending + g.active + r.pending,
    overdueItems: t.overdue + g.overdue + r.overdue
  };
}

/**
 * Tareas creadas y con vencimiento en cada uno de los últimos 7 días naturales (hora local).
 * La API no guarda cuándo se completa una tarea, así que no se puede mostrar "completadas por día".
 */
export function taskActivityChart(tasks: readonly TaskView[], now: Date): ChartData {
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));
  const countByDay = (dates: string[]) =>
    days.map(day => dates.filter(date => date && daysBetween(day, date) === 0).length);

  return {
    labels: days.map(day => day.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Tasks Due',
        data: countByDay(tasks.map(t => t.dueDate)),
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderColor: '#28a745',
        fill: true
      },
      {
        label: 'New Tasks',
        data: countByDay(tasks.map(t => t.createdDate)),
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderColor: '#007bff',
        fill: true
      }
    ]
  };
}

/** Goals por estado. Los estados son excluyentes, así que la suma es el total de goals. */
export function goalStatusChart(goals: readonly GoalView[]): ChartData {
  const order: GoalStatus[] = ['completed', 'inProgress', 'notStarted', 'overdue'];
  return {
    labels: ['Completed', 'In Progress', 'Not Started', 'Overdue'],
    datasets: [
      {
        label: 'Goals',
        data: order.map(status => goals.filter(g => g.status === status).length),
        backgroundColor: ['#28a745', '#ffc107', '#6c757d', '#dc3545']
      }
    ]
  };
}

/** Recordatorios pendientes (no vencidos) por momento. */
export function upcomingRemindersChart(reminders: readonly ReminderView[]): ChartData {
  const { today, tomorrow, thisWeek, later } = reminderStats(reminders);
  return {
    labels: ['Today', 'Tomorrow', 'This Week', 'Later'],
    datasets: [
      {
        label: 'Upcoming Reminders',
        data: [today, tomorrow, thisWeek, later],
        backgroundColor: ['#ffc107', '#17a2b8', '#007bff', '#6c757d']
      }
    ]
  };
}

/** Elementos vencidos, con su fecha límite real, más recientes primero (máximo `limit`). */
export function needsAttention(
  tasks: readonly TaskView[],
  goals: readonly GoalView[],
  reminders: readonly ReminderView[],
  limit = 10
): RecentActivity[] {
  const items: RecentActivity[] = [
    ...tasks
      .filter(task => task.isOverdue)
      .map((task): RecentActivity => ({
        id: `task-overdue-${task.taskId}`,
        type: 'task',
        action: 'overdue',
        title: task.taskName,
        timestamp: startOfDay(task.dueDate), // día local (new Date('YYYY-MM-DD') sería medianoche UTC)
        icon: 'bi bi-exclamation-triangle-fill',
        color: 'text-danger',
        link: '/tasks'
      })),
    ...goals
      .filter(goal => goal.isOverdue)
      .map((goal): RecentActivity => ({
        id: `goal-overdue-${goal.goalId}`,
        type: 'goal',
        action: 'overdue',
        title: goal.goalName,
        timestamp: startOfDay(goal.endDate),
        icon: 'bi bi-flag-fill',
        color: 'text-danger',
        link: '/goals'
      })),
    ...reminders
      .filter(reminder => reminder.isOverdue)
      .map((reminder): RecentActivity => ({
        id: `reminder-overdue-${reminder.reminderId}`,
        type: 'reminder',
        action: 'overdue',
        title: reminder.title,
        timestamp: new Date(reminder.reminderDateTime),
        icon: 'bi bi-bell-fill',
        color: 'text-danger',
        link: '/reminders'
      }))
  ];

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

/** Tareas pendientes que vencen antes, seguidas de las completadas. */
export function upcomingTasks(tasks: readonly TaskView[], limit = 5): TaskView[] {
  return sortTasks(tasks).slice(0, limit);
}
