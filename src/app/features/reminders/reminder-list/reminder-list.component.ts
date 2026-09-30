import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReminderItemComponent } from '../ui/reminder-item/reminder-item.component';
import { NewReminderComponent } from '../ui/new-reminder/new-reminder.component';
import { ReminderDetailsComponent } from '../ui/reminder-details/reminder-details.component';
import { ReminderStore } from '../data-access/reminder.store';
import { ReminderAlertsService } from '../data-access/reminder-alerts.service';
import { selectReminders } from '../domain/reminder.rules';
import { ReminderFilter, ReminderInput, ReminderView } from '../reminder.model';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notifications/notification.service';

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
  private store = inject(ReminderStore);
  protected readonly alerts = inject(ReminderAlertsService);
  private notificationService = inject(NotificationService);

  readonly filter = signal<ReminderFilter>('all');
  private readonly searchTerm = signal('');

  // Estado compartido: vive en el store
  readonly stats = this.store.stats;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  readonly filteredReminders = computed(() =>
    selectReminders(this.store.reminders(), { filter: this.filter(), search: this.searchTerm() })
  );

  // UI State
  readonly showNewReminderModal = signal(false);
  readonly creating = signal(false);
  readonly viewMode = signal<'grid' | 'list'>('grid'); // Para cambiar vista
  // Se guarda el id (no el objeto) para que el detalle refleje siempre el estado actual del store
  private readonly selectedReminderId = signal<number | null>(null);
  readonly selectedReminder = computed(
    () => this.store.reminders().find(r => r.reminderId === this.selectedReminderId()) ?? null
  );
  readonly showDetailsModal = computed(() => this.selectedReminder() !== null);

  ngOnInit() {
    // Usa los datos en memoria si ya se cargaron (p. ej. desde el dashboard)
    this.store.load();
  }

  setFilter(filter: ReminderFilter) {
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

    this.store.create(reminderData).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewReminderModal();
        this.notificationService.success($localize`Reminder created successfully`, $localize`Success`);
      },
      error: (error: ApiError) => {
        // El modal sigue abierto para poder reintentar sin perder los datos
        this.creating.set(false);
        this.notificationService.error(error.message, $localize`Error creating reminder`);
      }
    });
  }

  onReminderUpdated() {
    this.notificationService.success($localize`Reminder updated successfully`, $localize`Success`);
  }

  viewReminderDetails(reminder: ReminderView) {
    this.selectedReminderId.set(reminder.reminderId);
  }

  closeDetailsModal() {
    this.selectedReminderId.set(null);
  }

  toggleReminderAcknowledgement(reminder: ReminderView) {
    this.store.toggleAcknowledgement(reminder.reminderId).subscribe({
      error: (error: ApiError) => this.notificationService.error(error.message, $localize`Error updating reminder`)
    });
  }

  deleteReminder(reminderId: number) {
    this.store.delete(reminderId).subscribe({
      next: () => this.notificationService.success($localize`Reminder deleted successfully`, $localize`Success`),
      error: (error: ApiError) => this.notificationService.error(error.message, $localize`Error deleting reminder`)
    });
  }

  retry() {
    this.store.load({ force: true });
  }

  // Métodos auxiliares para la vista de lista
  getReminderListIcon(reminder: ReminderView): string {
    if (reminder.isAcknowledged) return 'bi bi-check-circle-fill text-success';
    if (reminder.isOverdue) return 'bi bi-exclamation-circle-fill text-danger';
    if (reminder.isToday) return 'bi bi-bell-fill text-warning';
    if (reminder.isTomorrow) return 'bi bi-clock-fill text-info';
    return 'bi bi-bell-fill text-primary';
  }

  getListBadgeClass(reminder: ReminderView): string {
    if (reminder.isAcknowledged) return 'text-bg-success';
    if (reminder.isOverdue) return 'text-bg-danger';
    if (reminder.isToday) return 'text-bg-warning';
    if (reminder.isTomorrow) return 'text-bg-info';
    return 'text-bg-primary';
  }

  getListBadgeText(reminder: ReminderView): string {
    if (reminder.isAcknowledged) return $localize`Done`;
    if (reminder.isOverdue) return $localize`Overdue`;
    if (reminder.isToday) return $localize`Today`;
    if (reminder.isTomorrow) return $localize`Tomorrow`;
    return $localize`Upcoming`;
  }
}
