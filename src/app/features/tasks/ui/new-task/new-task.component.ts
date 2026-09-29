import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { TaskInput, TaskResponse } from '../../task.model';
import { addDays, toDateInputValue } from '../../../../shared/utils/date';

type Frequency = TaskResponse['frequency'];

@Component({
  selector: 'app-new-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewTaskComponent {
  /** Lo controla el padre: true mientras se guarda la tarea. */
  readonly submitting = input(false);
  readonly closed = output<void>();
  readonly taskCreated = output<TaskInput>();

  private fb = inject(FormBuilder).nonNullable;

  readonly frequencies: { value: Frequency; label: string }[] = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  readonly taskForm = this.fb.group({
    taskName: ['', [Validators.required, Validators.minLength(3)]],
    frequency: ['Daily' as Frequency, Validators.required],
    startDate: [toDateInputValue(), Validators.required],
    dueDate: [toDateInputValue(addDays(new Date(), 7)), Validators.required],
    description: ['']
  });

  constructor() {
    merge(this.taskForm.controls.startDate.valueChanges, this.taskForm.controls.dueDate.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.validateDates());
  }

  private validateDates() {
    const { startDate, dueDate } = this.taskForm.getRawValue();
    const dueControl = this.taskForm.controls.dueDate;
    if (!startDate || !dueDate) return;

    if (new Date(dueDate) < new Date(startDate)) {
      dueControl.setErrors({ ...dueControl.errors, dueDateBeforeStart: true });
    } else if (dueControl.errors?.['dueDateBeforeStart']) {
      const { dueDateBeforeStart: _removed, ...otherErrors } = dueControl.errors;
      dueControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
  }

  onSubmit() {
    if (this.taskForm.valid) {
      this.taskCreated.emit(this.taskForm.getRawValue());
    } else {
      this.taskForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.closed.emit();
  }
}
