import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReminderInput } from '../../reminder.model';
import { toDateTimeInputValue } from '../../../../shared/utils/date';
import { notInPastValidator } from '../../../../shared/forms/date-validators';

@Component({
  selector: 'app-new-reminder',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './new-reminder.component.html',
  styleUrls: ['./new-reminder.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewReminderComponent {
  /** Lo controla el padre: true mientras se guarda el recordatorio. */
  readonly submitting = input(false);
  readonly closed = output<void>();
  readonly reminderCreated = output<ReminderInput>();

  private fb = inject(FormBuilder).nonNullable;

  readonly reminderForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    reminderDateTime: [toDateTimeInputValue(this.nextHour()), [Validators.required, notInPastValidator()]]
  });

  private nextHour(): Date {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  }

  onSubmit() {
    if (this.reminderForm.valid) {
      this.reminderCreated.emit(this.reminderForm.getRawValue());
    } else {
      this.reminderForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.closed.emit();
  }
}
