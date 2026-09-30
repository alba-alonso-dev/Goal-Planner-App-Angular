import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ReminderView } from '../../reminder.model';
import { ReminderStore } from '../../data-access/reminder.store';
import { ApiError } from '../../../../core/http/api-error';
import { toDateTimeInputValue } from '../../../../shared/utils/date';
import { notInPastValidator } from '../../../../shared/forms/date-validators';

@Component({
  selector: 'app-reminder-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reminder-details.component.html',
  styleUrls: ['./reminder-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderDetailsComponent {
  /** El padre lo obtiene del store, así que refleja siempre el último estado guardado. */
  readonly reminder = input.required<ReminderView>();
  readonly closed = output<void>();
  readonly reminderUpdated = output<void>();
  readonly delete = output<number>();

  private fb = inject(FormBuilder);
  private store = inject(ReminderStore);

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    // Solo se exige una fecha futura si se cambia: así se puede editar un recordatorio vencido
    reminderDateTime: ['', [Validators.required, notInPastValidator({ onlyWhenChanged: true })]],
    isAcknowledged: [false]
  });

  constructor() {
    // Rellenar el formulario cuando cambia el recordatorio, salvo mientras se está editando
    effect(() => {
      const reminder = this.reminder();
      untracked(() => {
        if (!this.editMode()) this.initForm(reminder);
      });
    });
  }

  private initForm(reminder: ReminderView) {
    this.editForm.reset({
      title: reminder.title,
      description: reminder.description || '',
      reminderDateTime: this.formatDateTimeForInput(reminder.reminderDateTime),
      isAcknowledged: reminder.isAcknowledged
    });
  }

  // Hora local: con toISOString() el input mostraba la hora UTC y al guardar se desplazaba
  private formatDateTimeForInput(date: string): string {
    try {
      return toDateTimeInputValue(date || new Date());
    } catch {
      return toDateTimeInputValue();
    }
  }

  toggleEditMode() {
    this.editMode.update(value => !value);
    this.error.set(null);
    if (!this.editMode()) {
      this.initForm(this.reminder());
    }
  }

  toggleAcknowledgement() {
    this.error.set(null);
    this.store.toggleAcknowledgement(this.reminder().reminderId).subscribe({
      next: () => this.reminderUpdated.emit(),
      error: (error: ApiError) => this.error.set(error.message || 'Error updating reminder')
    });
  }

  saveChanges() {
    if (!this.editForm.valid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.store.update(this.reminder().reminderId, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.editMode.set(false);
        this.reminderUpdated.emit();
      },
      error: (error: ApiError) => {
        this.error.set(error.message || 'Error updating reminder');
        this.submitting.set(false);
      }
    });
  }

  deleteReminder() {
    if (confirm(`Are you sure you want to delete "${this.reminder().title}"?`)) {
      this.delete.emit(this.reminder().reminderId);
      this.closeModal();
    }
  }

  closeModal() {
    this.closed.emit();
  }

  getStatusIcon(): string {
    const reminder = this.reminder();
    if (reminder.isAcknowledged) return 'bi bi-check-circle-fill text-success';
    if (reminder.isOverdue) return 'bi bi-exclamation-circle-fill text-danger';
    if (reminder.isToday) return 'bi bi-bell-fill text-warning';
    if (reminder.isTomorrow) return 'bi bi-clock-fill text-info';
    return 'bi bi-bell-fill text-primary';
  }

  getStatusText(): string {
    const reminder = this.reminder();
    if (reminder.isAcknowledged) return 'Acknowledged';
    if (reminder.isOverdue) return 'Overdue';
    if (reminder.isToday) return 'Today';
    if (reminder.isTomorrow) return 'Tomorrow';
    return 'Upcoming';
  }

  getStatusClass(): string {
    const reminder = this.reminder();
    if (reminder.isAcknowledged) return 'bg-success';
    if (reminder.isOverdue) return 'bg-danger';
    if (reminder.isToday) return 'bg-warning';
    if (reminder.isTomorrow) return 'bg-info';
    return 'bg-primary';
  }
}
