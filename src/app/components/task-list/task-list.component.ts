import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { TaskResponse, TaskStats } from '../../model/task';
import { NewTaskComponent } from '../new-task/new-task.component';
import { TaskItemComponent } from '../task-item/task-item.component';
import { NotificationService } from '../../services/notification.service';
import { TaskDetailsComponent } from '../task-details/task-details.component';

type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NewTaskComponent,
    TaskItemComponent,
    TaskDetailsComponent
  ],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);

  // Signals
  private allTasks = signal<TaskResponse[]>([]);
  filter = signal<TaskFilter>('all');
  private searchTerm = signal('');

  // Tasks agrupadas por frecuencia
  dailyTasks = computed(() => {
    return this.filterTasksByFrequency('Daily');
  });

  weeklyTasks = computed(() => {
    return this.filterTasksByFrequency('Weekly');
  });

  monthlyTasks = computed(() => {
    return this.filterTasksByFrequency('Monthly');
  });

  // Método auxiliar para filtrar y ordenar tareas por frecuencia
  private filterTasksByFrequency(frequency: 'Daily' | 'Weekly' | 'Monthly'): TaskResponse[] {
    let tasks = this.allTasks().filter(t => t.frequency === frequency);

    // Aplicar filtro de estado
    switch (this.filter()) {
      case 'pending':
        tasks = tasks.filter(t => !t.isCompleted && !t.isOverdue);
        break;
      case 'completed':
        tasks = tasks.filter(t => t.isCompleted);
        break;
      case 'overdue':
        tasks = tasks.filter(t => !t.isCompleted && t.isOverdue);
        break;
      default:
        break;
    }

    // Aplicar búsqueda
    const search = this.searchTerm().toLowerCase();
    if (search) {
      tasks = tasks.filter(t => 
        t.taskName.toLowerCase().includes(search) || 
        t.description?.toLowerCase().includes(search)
      );
    }

    // Ordenar: pendientes primero, luego por fecha
    return tasks.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  // Para mantener compatibilidad con la búsqueda global
  hasTasksInAnyCategory = computed(() => {
    return this.dailyTasks().length > 0 || 
           this.weeklyTasks().length > 0 || 
           this.monthlyTasks().length > 0;
  });

  stats = computed(() => {
    return this.taskService.getTaskStats(this.allTasks());
  });

  // UI State
  showNewTaskModal = false;
  showDetailsModal = false;
  selectedTask: TaskResponse | null = null;
  loading = false;
  error: string | null = null;

  // Colapsar/expandir secciones
  collapsedSections = signal({
    daily: false,
    weekly: false,
    monthly: false
  });

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.loading = true;
    this.error = null;

    this.taskService.getAllTasksByUser().subscribe({
      next: (tasks) => {
        this.allTasks.set(tasks);
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error loading tasks:', error);
      }
    });
  }

  setFilter(filter: TaskFilter) {
    this.filter.set(filter);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  openNewTaskModal() {
    this.showNewTaskModal = true;
  }

  closeNewTaskModal() {
    this.showNewTaskModal = false;
  }

  onTaskCreated(taskData: any) {
    this.loading = true;

    this.taskService.createTask(taskData).subscribe({
      next: (response) => {
        this.loadTasks();
        this.closeNewTaskModal();
        this.notificationService.success('Task created successfully', 'Success');
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error creating task:', error);
      }
    });
  }

  onTaskUpdated() {
    this.loadTasks();
    this.notificationService.success('Task updated successfully', 'Success');
  }

  toggleTaskCompletion(task: TaskResponse) {
    this.taskService.toggleTaskCompletion(task).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error toggling task:', error);
        this.notificationService.error('Error updating task', 'Error');
      }
    });
  }

  viewTaskDetails(task: TaskResponse) {
    this.selectedTask = task;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedTask = null;
  }

  deleteTask(taskId: number) {
    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.loadTasks();
        this.notificationService.success('Task deleted successfully', 'Success');
      },
      error: (error) => {
        console.error('Error deleting task:', error);
        this.notificationService.error('Error deleting task', 'Error');
      }
    });
  }

  retry() {
    this.loadTasks();
  }

  toggleSection(section: 'daily' | 'weekly' | 'monthly') {
    this.collapsedSections.update(current => ({
      ...current,
      [section]: !current[section]
    }));
  }

  getFrequencyIcon(frequency: string): string {
    switch(frequency) {
      case 'Daily': return 'fas fa-sun';
      case 'Weekly': return 'fas fa-calendar-week';
      case 'Monthly': return 'fas fa-calendar-alt';
      default: return 'fas fa-clock';
    }
  }

  getSectionCount(section: TaskResponse[]): number {
    return section.length;
  }

  // Para usar en el template
  protected Math = Math;
}