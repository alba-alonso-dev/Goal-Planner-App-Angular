import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskInput, TaskResponse } from '../../task.model';
import { addDays, toDateInputValue } from '../../../../shared/utils/date';
import { dateOrderValidator } from '../../../../shared/forms/date-validators';

type Frequency = TaskResponse['frequency'];

import { DialogDirective } from '../../../../shared/ui/dialog.directive';

@Component({
  selector: 'app-new-task',
  standalone: true,
  imports: [DialogDirective, ReactiveFormsModule],
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

  readonly taskForm = this.fb.group(
    {
      taskName: ['', [Validators.required, Validators.minLength(3)]],
      frequency: ['Daily' as Frequency, Validators.required],
      startDate: [toDateInputValue(), Validators.required],
      dueDate: [toDateInputValue(addDays(new Date(), 7)), Validators.required],
      description: ['']
    },
    { validators: dateOrderValidator('startDate', 'dueDate', 'dueDateBeforeStart') }
  );

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
