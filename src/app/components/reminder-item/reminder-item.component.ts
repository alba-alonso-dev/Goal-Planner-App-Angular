import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderResponse } from '../../model/reminder';

@Component({
  selector: 'app-reminder-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reminder-item.component.html',
  styleUrls: ['./reminder-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderItemComponent {
  readonly reminder = input.required<ReminderResponse>();
  readonly toggleAcknowledge = output<ReminderResponse>();
  readonly viewDetails = output<ReminderResponse>();
  readonly delete = output<number>();

  onToggleAcknowledge(event: Event) {
    event.stopPropagation();
    this.toggleAcknowledge.emit(this.reminder());
  }

  onViewDetails() {
    this.viewDetails.emit(this.reminder());
  }

  onDelete(event: Event) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${this.reminder().title}"?`)) {
      this.delete.emit(this.reminder().reminderId);
    }
  }

  getReminderTypeClass(): string {
    if (this.reminder().isAcknowledged) return 'border-success';
    if (this.reminder().isOverdue) return 'border-danger';
    if (this.reminder().isToday) return 'border-warning';
    if (this.reminder().isTomorrow) return 'border-info';
    return 'border-primary';
  }

  getReminderIcon(): string {
    if (this.reminder().isAcknowledged) return 'fas fa-check-circle text-success';
    if (this.reminder().isOverdue) return 'fas fa-exclamation-circle text-danger';
    if (this.reminder().isToday) return 'fas fa-bell text-warning';
    if (this.reminder().isTomorrow) return 'fas fa-clock text-info';
    return 'fas fa-bell text-primary';
  }

  getTimeBadgeClass(): string {
    if (this.reminder().isAcknowledged) return 'bg-success';
    if (this.reminder().isOverdue) return 'bg-danger';
    if (this.reminder().isToday) return 'bg-warning';
    if (this.reminder().isTomorrow) return 'bg-info';
    return 'bg-primary';
  }

  getTimeText(): string {
    if (this.reminder().isAcknowledged) return 'Done';
    if (this.reminder().isOverdue) return 'Overdue';
    if (this.reminder().isToday) return 'Today';
    if (this.reminder().isTomorrow) return 'Tomorrow';
    return this.reminder().timeRemaining || '';
  }
}
