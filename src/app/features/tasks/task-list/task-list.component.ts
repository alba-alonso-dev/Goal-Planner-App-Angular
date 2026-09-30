import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskStore } from '../data-access/task.store';
import { selectTasks } from '../domain/task.rules';
import { TaskFilter, TaskFrequency, TaskInput, TaskView } from '../task.model';
import { ApiError } from '../../../core/http/api-error';
import { NewTaskComponent } from '../ui/new-task/new-task.component';
import { TaskItemComponent } from '../ui/task-item/task-item.component';
import { NotificationService } from '../../../core/notifications/notification.service';
import { TaskDetailsComponent } from '../ui/task-details/task-details.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [RouterModule, FormsModule, NewTaskComponent, TaskItemComponent, TaskDetailsComponent],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskListComponent implements OnInit {
  private store = inject(TaskStore);
  private notificationService = inject(NotificationService);

  readonly filter = signal<TaskFilter>('all');
  private readonly searchTerm = signal('');

  // Estado compartido: vive en el store
  readonly stats = this.store.stats;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  // Tasks agrupadas por frecuencia, filtradas y ordenadas
  readonly dailyTasks = computed(() => this.select('Daily'));
  readonly weeklyTasks = computed(() => this.select('Weekly'));
  readonly monthlyTasks = computed(() => this.select('Monthly'));

  readonly hasTasksInAnyCategory = computed(
    () => this.dailyTasks().length > 0 || this.weeklyTasks().length > 0 || this.monthlyTasks().length > 0
  );

  // UI State
  readonly showNewTaskModal = signal(false);
  readonly creating = signal(false);
  // Se guarda el id (no el objeto) para que el detalle refleje siempre el estado actual del store
  private readonly selectedTaskId = signal<number | null>(null);
  readonly selectedTask = computed(() => this.store.tasks().find(t => t.taskId === this.selectedTaskId()) ?? null);
  readonly showDetailsModal = computed(() => this.selectedTask() !== null);

  // Colapsar/expandir secciones
  readonly collapsedSections = signal({
    daily: false,
    weekly: false,
    monthly: false
  });

  ngOnInit() {
    // Usa los datos en memoria si ya se cargaron (p. ej. desde el dashboard)
    this.store.load();
  }

  private select(frequency: TaskFrequency): TaskView[] {
    return selectTasks(this.store.tasks(), { frequency, filter: this.filter(), search: this.searchTerm() });
  }

  setFilter(filter: TaskFilter) {
    this.filter.set(filter);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  openNewTaskModal() {
    this.showNewTaskModal.set(true);
  }

  closeNewTaskModal() {
    this.showNewTaskModal.set(false);
  }

  onTaskCreated(taskData: TaskInput) {
    this.creating.set(true);

    this.store.create(taskData).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewTaskModal();
        this.notificationService.success('Task created successfully', 'Success');
      },
      error: (error: ApiError) => {
        // El modal sigue abierto para poder reintentar sin perder los datos
        this.creating.set(false);
        this.notificationService.error(error.message, 'Error creating task');
      }
    });
  }

  onTaskUpdated() {
    this.notificationService.success('Task updated successfully', 'Success');
  }

  toggleTaskCompletion(task: TaskView) {
    this.store.toggleCompletion(task.taskId).subscribe({
      error: (error: ApiError) => this.notificationService.error(error.message, 'Error updating task')
    });
  }

  viewTaskDetails(task: TaskView) {
    this.selectedTaskId.set(task.taskId);
  }

  closeDetailsModal() {
    this.selectedTaskId.set(null);
  }

  deleteTask(taskId: number) {
    this.store.delete(taskId).subscribe({
      next: () => this.notificationService.success('Task deleted successfully', 'Success'),
      error: (error: ApiError) => this.notificationService.error(error.message, 'Error deleting task')
    });
  }

  retry() {
    this.store.load({ force: true });
  }

  toggleSection(section: 'daily' | 'weekly' | 'monthly') {
    this.collapsedSections.update(current => ({
      ...current,
      [section]: !current[section]
    }));
  }

  getFrequencyIcon(frequency: string): string {
    switch (frequency) {
      case 'Daily':
        return 'bi bi-sun-fill';
      case 'Weekly':
        return 'bi bi-calendar-week';
      case 'Monthly':
        return 'bi bi-calendar3';
      default:
        return 'bi bi-clock-fill';
    }
  }
}
