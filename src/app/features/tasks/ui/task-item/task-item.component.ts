import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskView } from '../../task.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskItemComponent {
  readonly task = input.required<TaskView>();
  readonly toggleCompletion = output<TaskView>();
  readonly viewDetails = output<TaskView>();
  readonly delete = output<number>();

  onToggleComplete(event: Event) {
    event.stopPropagation();
    this.toggleCompletion.emit(this.task());
  }

  onViewDetails() {
    this.viewDetails.emit(this.task());
  }

  onDelete(event: Event) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${this.task().taskName}"?`)) {
      this.delete.emit(this.task().taskId);
    }
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

  getStatusClass(): string {
    if (this.task().isCompleted) return 'text-success';
    if (this.task().isOverdue) return 'text-danger';
    return 'text-warning';
  }

  getStatusText(): string {
    if (this.task().isCompleted) return 'Completed';
    if (this.task().isOverdue) return 'Overdue';
    return 'Pending';
  }

  // Para usar en el template
  protected Math = Math;
}
