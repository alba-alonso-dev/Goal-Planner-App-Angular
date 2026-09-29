import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map } from 'rxjs';
import { TaskService } from './task.service';
import { GoalService } from './goal.service';
import { ReminderService } from './reminder.service';
import { TaskResponse } from '../model/task';
import { GoalResponse } from '../model/goal';
import { ReminderResponse } from '../model/reminder';
import { ChartData, DashboardStats, RecentActivity } from '../model/dashboard';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private reminderService = inject(ReminderService);

  // Signals públicas
  tasks = signal<TaskResponse[]>([]);
  goals = signal<GoalResponse[]>([]);
  reminders = signal<ReminderResponse[]>([]);
  
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Computed stats
  stats = computed<DashboardStats>(() => {
    const tasks = this.tasks();
    const goals = this.goals();
    const reminders = this.reminders();

    // Tasks stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const pendingTasks = tasks.filter(t => !t.isCompleted && !t.isOverdue).length;
    const overdueTasks = tasks.filter(t => !t.isCompleted && t.isOverdue).length;
    
    const tasksByFrequency = {
      daily: tasks.filter(t => t.frequency === 'Daily').length,
      weekly: tasks.filter(t => t.frequency === 'Weekly').length,
      monthly: tasks.filter(t => t.frequency === 'Monthly').length
    };

    // Goals stats
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.isAchieved).length;
    const activeGoals = goals.filter(g => !g.isAchieved && !this.isGoalOverdue(g)).length;
    const overdueGoals = goals.filter(g => !g.isAchieved && this.isGoalOverdue(g)).length;
    
    const averageGoalProgress = goals.length > 0 
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
      : 0;

    // Reminders stats
    const totalReminders = reminders.length;
    const acknowledgedReminders = reminders.filter(r => r.isAcknowledged).length;
    const pendingReminders = reminders.filter(r => !r.isAcknowledged && !r.isOverdue).length;
    const overdueReminders = reminders.filter(r => !r.isAcknowledged && r.isOverdue).length;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const remindersByTime = {
      today: reminders.filter(r => {
        if (r.isAcknowledged) return false;
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === today.getTime();
      }).length,
      tomorrow: reminders.filter(r => {
        if (r.isAcknowledged) return false;
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === tomorrow.getTime();
      }).length,
      thisWeek: reminders.filter(r => {
        if (r.isAcknowledged) return false;
        const rDate = new Date(r.reminderDateTime);
        return rDate >= today && rDate <= nextWeek && 
               rDate.getTime() !== today.getTime() && 
               rDate.getTime() !== tomorrow.getTime();
      }).length,
      later: reminders.filter(r => {
        if (r.isAcknowledged) return false;
        const rDate = new Date(r.reminderDateTime);
        return rDate > nextWeek;
      }).length
    };

    // Combined stats
    const totalItems = totalTasks + totalGoals + totalReminders;
    const activeItems = pendingTasks + activeGoals + pendingReminders;
    const overdueItems = overdueTasks + overdueGoals + overdueReminders;
    
    const completedItems = completedTasks + completedGoals + acknowledgedReminders;
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      tasksByFrequency,
      
      totalGoals,
      completedGoals,
      activeGoals,
      overdueGoals,
      averageGoalProgress,
      
      totalReminders,
      acknowledgedReminders,
      pendingReminders,
      overdueReminders,
      remindersByTime,
      
      completionRate,
      totalItems,
      activeItems,
      overdueItems
    };
  });

  // Recent activity
  recentActivity = computed<RecentActivity[]>(() => {
    const activities: RecentActivity[] = [];
    const now = new Date();

    // Add completed tasks
    this.tasks().forEach(task => {
      if (task.isCompleted) {
        activities.push({
          id: `task-completed-${task.taskId}-${Date.now()}`,
          type: 'task',
          action: 'completed',
          title: task.taskName,
          timestamp: new Date(now.getTime() - Math.random() * 86400000),
          icon: 'bi bi-check-circle-fill',
          color: 'text-success',
          link: '/tasks'
        });
      }
    });

    // Add overdue tasks
    this.tasks().forEach(task => {
      if (!task.isCompleted && task.isOverdue) {
        activities.push({
          id: `task-overdue-${task.taskId}-${Date.now()}`,
          type: 'task',
          action: 'overdue',
          title: task.taskName,
          timestamp: new Date(task.dueDate),
          icon: 'bi bi-exclamation-triangle-fill',
          color: 'text-danger',
          link: '/tasks'
        });
      }
    });

    // Add completed goals
    this.goals().forEach(goal => {
      if (goal.isAchieved) {
        activities.push({
          id: `goal-completed-${goal.goalId}-${Date.now()}`,
          type: 'goal',
          action: 'completed',
          title: goal.goalName,
          timestamp: new Date(now.getTime() - Math.random() * 86400000 * 2),
          icon: 'bi bi-flag-fill',
          color: 'text-primary',
          link: '/goals'
        });
      }
    });

    // Add overdue goals
    this.goals().forEach(goal => {
      if (!goal.isAchieved && this.isGoalOverdue(goal)) {
        activities.push({
          id: `goal-overdue-${goal.goalId}-${Date.now()}`,
          type: 'goal',
          action: 'overdue',
          title: goal.goalName,
          timestamp: new Date(goal.endDate),
          icon: 'bi bi-exclamation-triangle-fill',
          color: 'text-danger',
          link: '/goals'
        });
      }
    });

    // Add acknowledged reminders
    this.reminders().forEach(reminder => {
      if (reminder.isAcknowledged) {
        activities.push({
          id: `reminder-ack-${reminder.reminderId}-${Date.now()}`,
          type: 'reminder',
          action: 'acknowledged',
          title: reminder.title,
          timestamp: new Date(now.getTime() - Math.random() * 86400000 * 3),
          icon: 'bi bi-bell-fill',
          color: 'text-warning',
          link: '/reminders'
        });
      }
    });

    // Add overdue reminders
    this.reminders().forEach(reminder => {
      if (!reminder.isAcknowledged && reminder.isOverdue) {
        activities.push({
          id: `reminder-overdue-${reminder.reminderId}-${Date.now()}`,
          type: 'reminder',
          action: 'overdue',
          title: reminder.title,
          timestamp: new Date(reminder.reminderDateTime),
          icon: 'bi bi-exclamation-triangle-fill',
          color: 'text-danger',
          link: '/reminders'
        });
      }
    });

    // Sort by timestamp descending and limit to 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  });

  constructor() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading.set(true);
    this.error.set(null);

    combineLatest([
      this.taskService.getAllTasksByUser(),
      this.goalService.getAllGoalsByUser(),
      this.reminderService.getAllRemindersByUser()
    ]).subscribe({
      next: ([tasks, goals, reminders]) => {
        this.tasks.set(tasks);
        this.goals.set(goals);
        this.reminders.set(reminders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.error.set(err.message || 'Error loading dashboard data');
        this.loading.set(false);
      }
    });
  }

  refresh() {
    this.loadDashboardData();
  }

  private isGoalOverdue(goal: GoalResponse): boolean {
    if (goal.isAchieved) return false;
    const today = new Date();
    const endDate = new Date(goal.endDate);
    return endDate < today;
  }

  // Task Chart Data
  getTaskChartData(): ChartData {
    const tasks = this.tasks();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const completedData = last7Days.map(date => {
      return tasks.filter(t => {
        if (!t.isCompleted) return false;
        const completedDate = new Date(t.dueDate).toISOString().split('T')[0];
        return completedDate === date;
      }).length;
    });

    const createdData = last7Days.map(date => {
      return tasks.filter(t => {
        const createdDate = new Date(t.createdDate).toISOString().split('T')[0];
        return createdDate === date;
      }).length;
    });

    return {
      labels: last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Completed Tasks',
          data: completedData,
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderColor: '#28a745',
          fill: true
        },
        {
          label: 'New Tasks',
          data: createdData,
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          borderColor: '#007bff',
          fill: true
        }
      ]
    };
  }

  // Goal Chart Data
  getGoalProgressChartData(): ChartData {
    const goals = this.goals();
    
    const completed = goals.filter(g => g.isAchieved).length;
    const inProgress = goals.filter(g => !g.isAchieved && (g.progress || 0) > 0 && (g.progress || 0) < 100).length;
    const notStarted = goals.filter(g => !g.isAchieved && (g.progress || 0) === 0).length;
    const overdue = goals.filter(g => !g.isAchieved && this.isGoalOverdue(g)).length;

    return {
      labels: ['Completed', 'In Progress', 'Not Started', 'Overdue'],
      datasets: [
        {
          label: 'Goals',
          data: [completed, inProgress, notStarted, overdue],
          backgroundColor: ['#28a745', '#ffc107', '#6c757d', '#dc3545'],
        }
      ]
    };
  }

  // Reminder Chart Data
  getReminderChartData(): ChartData {
    const reminders = this.reminders();
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const today_count = reminders.filter(r => {
      if (r.isAcknowledged) return false;
      const rDate = new Date(r.reminderDateTime);
      rDate.setHours(0, 0, 0, 0);
      return rDate.getTime() === today.getTime();
    }).length;

    const tomorrow_count = reminders.filter(r => {
      if (r.isAcknowledged) return false;
      const rDate = new Date(r.reminderDateTime);
      rDate.setHours(0, 0, 0, 0);
      return rDate.getTime() === tomorrow.getTime();
    }).length;

    const thisWeek_count = reminders.filter(r => {
      if (r.isAcknowledged) return false;
      const rDate = new Date(r.reminderDateTime);
      return rDate > tomorrow && rDate <= nextWeek;
    }).length;

    const later_count = reminders.filter(r => {
      if (r.isAcknowledged) return false;
      const rDate = new Date(r.reminderDateTime);
      return rDate > nextWeek;
    }).length;

    return {
      labels: ['Today', 'Tomorrow', 'This Week', 'Later'],
      datasets: [
        {
          label: 'Upcoming Reminders',
          data: [today_count, tomorrow_count, thisWeek_count, later_count],
          backgroundColor: ['#ffc107', '#17a2b8', '#007bff', '#6c757d'],
        }
      ]
    };
  }

  // Recent tasks for table
  getRecentTasks(limit: number = 5): TaskResponse[] {
    return this.tasks()
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, limit);
  }
}