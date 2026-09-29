import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ReminderResponse } from '../../reminder.model';
import { ReminderService } from '../../data-access/reminder.service';
import { ApiError } from '../../../../core/http/api-error';
import { toDateTimeInputValue } from '../../../../shared/utils/date';

@Component({
  selector: 'app-reminder-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reminder-details.component.html',
  styleUrls: ['./reminder-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderDetailsComponent {
  readonly reminder = input.required<ReminderResponse>();
  readonly closed = output<void>();
  readonly reminderUpdated = output<void>();
  readonly delete = output<number>();

  private fb = inject(FormBuilder);
  private reminderService = inject(ReminderService);

  // Copia local del recordatorio: parte del input y se sustituye tras guardar cambios
  readonly currentReminder = linkedSignal(() => this.reminder());

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    reminderDateTime: ['', Validators.required],
    isAcknowledged: [false]
  });

  constructor() {
    // Rellenar el formulario cada vez que cambia el recordatorio (input o recarga tras guardar)
    effect(() => {
      const reminder = this.currentReminder();
      untracked(() => this.initForm(reminder));
    });

    this.editForm.controls.reminderDateTime.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.validateDateTime());
  }

  private initForm(reminder: ReminderResponse) {
    this.editForm.reset({
      title: reminder.title,
      description: reminder.description || '',
      reminderDateTime: this.formatDateTimeForInput(reminder.reminderDateTime),
      isAcknowledged: reminder.isAcknowledged
    });
  }

  private validateDateTime() {
    const control = this.editForm.controls.reminderDateTime;
    if (control.value && new Date(control.value) < new Date()) {
      control.setErrors({ ...control.errors, pastDate: true });
    }
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
      this.initForm(this.currentReminder());
    }
  }

  toggleAcknowledgement() {
    this.submitting.set(true);
    this.reminderService.toggleReminderAcknowledgement(this.currentReminder()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.reminderUpdated.emit();
        this.loadUpdatedReminder();
      },
      error: (error: ApiError) => {
        this.error.set(error.message || 'Error updating reminder');
        this.submitting.set(false);
      }
    });
  }

  saveChanges() {
    if (!this.editForm.valid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.reminderService.updateReminder(this.currentReminder().reminderId, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.editMode.set(false);
        this.reminderUpdated.emit();
        this.loadUpdatedReminder();
      },
      error: (error: ApiError) => {
        this.error.set(error.message || 'Error updating reminder');
        this.submitting.set(false);
      }
    });
  }

  deleteReminder() {
    if (confirm(`Are you sure you want to delete "${this.currentReminder().title}"?`)) {
      this.delete.emit(this.currentReminder().reminderId);
      this.closeModal();
    }
  }

  private loadUpdatedReminder() {
    this.reminderService.getReminderById(this.currentReminder().reminderId).subscribe({
      next: updatedReminder => this.currentReminder.set(updatedReminder),
      error: error => console.error('Error loading updated reminder:', error)
    });
  }

  closeModal() {
    this.closed.emit();
  }

  getStatusIcon(): string {
    const reminder = this.currentReminder();
    if (reminder.isAcknowledged) return 'bi bi-check-circle-fill text-success';
    if (reminder.isOverdue) return 'bi bi-exclamation-circle-fill text-danger';
    if (reminder.isToday) return 'bi bi-bell-fill text-warning';
    if (reminder.isTomorrow) return 'bi bi-clock-fill text-info';
    return 'bi bi-bell-fill text-primary';
  }

  getStatusText(): string {
    const reminder = this.currentReminder();
    if (reminder.isAcknowledged) return 'Acknowledged';
    if (reminder.isOverdue) return 'Overdue';
    if (reminder.isToday) return 'Today';
    if (reminder.isTomorrow) return 'Tomorrow';
    return 'Upcoming';
  }

  getStatusClass(): string {
    const reminder = this.currentReminder();
    if (reminder.isAcknowledged) return 'bg-success';
    if (reminder.isOverdue) return 'bg-danger';
    if (reminder.isToday) return 'bg-warning';
    if (reminder.isTomorrow) return 'bg-info';
    return 'bg-primary';
  }
}
