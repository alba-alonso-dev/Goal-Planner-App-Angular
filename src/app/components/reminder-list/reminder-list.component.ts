import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReminderItemComponent } from '../reminder-item/reminder-item.component';
import { NewReminderComponent } from '../new-reminder/new-reminder.component';
import { ReminderDetailsComponent } from '../reminder-details/reminder-details.component';
import { ReminderService } from '../../services/reminder.service';
import { ReminderInput, ReminderResponse } from '../../model/reminder';
import { ApiError } from '../../core/http/api-error';
import { NotificationService } from '../../services/notification.service';

type FilterType = 'all' | 'pending' | 'acknowledged' | 'overdue';

@Component({
  selector: 'app-reminder-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ReminderItemComponent,
    NewReminderComponent,
    ReminderDetailsComponent
  ],
  templateUrl: './reminder-list.component.html',
  styleUrls: ['./reminder-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderListComponent implements OnInit {
  private reminderService = inject(ReminderService);
  private notificationService = inject(NotificationService);

  // Signals para mejor reactividad
  private allReminders = signal<ReminderResponse[]>([]);
  filter = signal<FilterType>('all');
  private searchTerm = signal('');

  // Computed signals para los reminders filtrados
  filteredReminders = computed(() => {
    let reminders = this.allReminders();

    // Aplicar filtro por estado
    switch (this.filter()) {
      case 'pending':
        reminders = reminders.filter(r => !r.isAcknowledged && !r.isOverdue);
        break;
      case 'acknowledged':
        reminders = reminders.filter(r => r.isAcknowledged);
        break;
      case 'overdue':
        reminders = reminders.filter(r => !r.isAcknowledged && r.isOverdue);
        break;
      default: // 'all'
        break;
    }

    // Aplicar búsqueda por texto
    const search = this.searchTerm().toLowerCase();
    if (search) {
      reminders = reminders.filter(
        r => r.title.toLowerCase().includes(search) || r.description?.toLowerCase().includes(search)
      );
    }

    return reminders;
  });

  // Estadísticas
  stats = computed(() => {
    const reminders = this.allReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    return {
      total: reminders.length,
      acknowledged: reminders.filter(r => r.isAcknowledged).length,
      pending: reminders.filter(r => !r.isAcknowledged && !r.isOverdue).length,
      overdue: reminders.filter(r => !r.isAcknowledged && r.isOverdue).length,
      today: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate.getTime() === today.getTime();
      }).length,
      tomorrow: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate.getTime() === tomorrow.getTime();
      }).length,
      thisWeek: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate >= today && rDate <= weekEnd;
      }).length
    };
  });

  readonly showNewReminderModal = signal(false);
  readonly showDetailsModal = signal(false);
  readonly selectedReminder = signal<ReminderResponse | null>(null);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly viewMode = signal<'grid' | 'list'>('grid'); // Para cambiar vista

  ngOnInit() {
    this.loadReminders();
  }

  loadReminders() {
    this.loading.set(true);
    this.error.set(null);

    this.reminderService.getAllRemindersByUser().subscribe({
      next: reminders => {
        this.allReminders.set(reminders);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
        console.error('Error loading reminders:', error);
      }
    });
  }

  setFilter(filter: FilterType) {
    this.filter.set(filter);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  toggleViewMode() {
    this.viewMode.update(mode => (mode === 'grid' ? 'list' : 'grid'));
  }

  openNewReminderModal() {
    this.showNewReminderModal.set(true);
  }

  closeNewReminderModal() {
    this.showNewReminderModal.set(false);
  }

  onReminderCreated(reminderData: ReminderInput) {
    this.creating.set(true);

    this.reminderService.createReminder(reminderData).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewReminderModal();
        this.loadReminders();
        this.notificationService.success('Reminder created successfully', 'Success');
      },
      error: (error: ApiError) => {
        // El modal sigue abierto para poder reintentar sin perder los datos
        this.creating.set(false);
        this.notificationService.error(error.message, 'Error creating reminder');
      }
    });
  }

  onReminderUpdated() {
    this.loadReminders();
  }

  viewReminderDetails(reminder: ReminderResponse) {
    if (!reminder.reminderId) return;

    this.loading.set(true);

    this.reminderService.getReminderById(reminder.reminderId).subscribe({
      next: reminderDetails => {
        this.selectedReminder.set(reminderDetails);
        this.showDetailsModal.set(true);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.notificationService.error(error.message, 'Error loading reminder details');
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedReminder.set(null);
  }

  toggleReminderAcknowledgement(reminder: ReminderResponse) {
    this.reminderService.toggleReminderAcknowledgement(reminder).subscribe({
      next: () => this.loadReminders(),
      error: (error: ApiError) => this.notificationService.error(error.message, 'Error updating reminder')
    });
  }

  deleteReminder(reminderId: number) {
    this.reminderService.deleteReminder(reminderId).subscribe({
      next: () => {
        this.loadReminders();
        this.notificationService.success('Reminder deleted successfully', 'Success');
      },
      error: (error: ApiError) => this.notificationService.error(error.message, 'Error deleting reminder')
    });
  }

  retry() {
    this.loadReminders();
  }

  // Métodos auxiliares para la vista de lista
  getReminderListIcon(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'fas fa-check-circle text-success';
    if (reminder.isOverdue) return 'fas fa-exclamation-circle text-danger';
    if (reminder.isToday) return 'fas fa-bell text-warning';
    if (reminder.isTomorrow) return 'fas fa-clock text-info';
    return 'fas fa-bell text-primary';
  }

  getListBadgeClass(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'bg-success';
    if (reminder.isOverdue) return 'bg-danger';
    if (reminder.isToday) return 'bg-warning';
    if (reminder.isTomorrow) return 'bg-info';
    return 'bg-primary';
  }

  getListBadgeText(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'Done';
    if (reminder.isOverdue) return 'Overdue';
    if (reminder.isToday) return 'Today';
    if (reminder.isTomorrow) return 'Tomorrow';
    return 'Upcoming';
  }
}
