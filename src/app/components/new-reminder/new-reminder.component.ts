import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReminderInput } from '../../model/reminder';
import { toDateTimeInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-new-reminder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-reminder.component.html',
  styleUrls: ['./new-reminder.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewReminderComponent {
  /** Lo controla el padre: true mientras se guarda el recordatorio. */
  readonly submitting = input(false);
  readonly close = output<void>();
  readonly reminderCreated = output<ReminderInput>();

  private fb = inject(FormBuilder).nonNullable;

  readonly reminderForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    reminderDateTime: [toDateTimeInputValue(this.nextHour()), Validators.required]
  });

  constructor() {
    this.reminderForm.controls.reminderDateTime.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.validateDateTime());
  }

  private nextHour(): Date {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  }

  private validateDateTime() {
    const control = this.reminderForm.controls.reminderDateTime;
    if (!control.value) return;

    if (new Date(control.value) < new Date()) {
      control.setErrors({ ...control.errors, pastDate: true });
    } else if (control.errors?.['pastDate']) {
      const { pastDate: _removed, ...otherErrors } = control.errors;
      control.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
  }

  onSubmit() {
    if (this.reminderForm.valid) {
      this.reminderCreated.emit(this.reminderForm.getRawValue());
    } else {
      this.reminderForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.close.emit();
  }
}
