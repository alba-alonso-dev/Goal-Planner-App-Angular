import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TaskFrequency, TaskView } from '../../task.model';
import { TaskStore } from '../../data-access/task.store';
import { ApiError } from '../../../../core/http/api-error';
import { toDateInputValue } from '../../../../shared/utils/date';
import { dateOrderValidator } from '../../../../shared/forms/date-validators';

import { DialogDirective } from '../../../../shared/ui/dialog.directive';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [DialogDirective, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailsComponent {
  /** El padre la obtiene del store, así que refleja siempre el último estado guardado. */
  readonly task = input.required<TaskView>();
  readonly closed = output<void>();
  readonly taskUpdated = output<void>();
  readonly delete = output<number>();

  private fb = inject(FormBuilder);
  private store = inject(TaskStore);

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly frequencies: { value: TaskFrequency; label: string }[] = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  readonly editForm = this.fb.nonNullable.group(
    {
      taskName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      frequency: ['Daily' as TaskFrequency, Validators.required],
      startDate: ['', Validators.required],
      dueDate: ['', Validators.required],
      isCompleted: [false]
    },
    { validators: dateOrderValidator('startDate', 'dueDate', 'dueDateBeforeStart') }
  );

  constructor() {
    // Rellenar el formulario cuando cambia la tarea, salvo mientras se está editando
    effect(() => {
      const task = this.task();
      untracked(() => {
        if (!this.editMode()) this.initForm(task);
      });
    });
  }

  private initForm(task: TaskView) {
    this.editForm.reset({
      taskName: task.taskName,
      description: task.description || '',
      frequency: task.frequency,
      startDate: this.formatDateForInput(task.startDate),
      dueDate: this.formatDateForInput(task.dueDate),
      isCompleted: task.isCompleted
    });
  }

  // Si la fecha falta o no es válida, se usa la fecha actual
  private formatDateForInput(date: string): string {
    try {
      return toDateInputValue(date || new Date());
    } catch {
      return toDateInputValue();
    }
  }

  toggleEditMode() {
    this.editMode.update(value => !value);
    this.error.set(null);
    if (!this.editMode()) {
      this.initForm(this.task());
    }
  }

  toggleCompletion() {
    this.error.set(null);
    this.store.toggleCompletion(this.task().taskId).subscribe({
      next: () => this.taskUpdated.emit(),
      error: (error: ApiError) => this.error.set(error.message || 'Error updating task')
    });
  }

  saveChanges() {
    if (!this.editForm.valid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.store.update(this.task().taskId, this.editForm.getRawValue()).subscribe({
      next: () => {
        // El store ya tiene la tarea actualizada; el padre la vuelve a pasar como input
        this.submitting.set(false);
        this.editMode.set(false);
        this.taskUpdated.emit();
      },
      error: (error: ApiError) => {
        this.error.set(error.message || 'Error updating task');
        this.submitting.set(false);
      }
    });
  }

  deleteTask() {
    if (confirm(`Are you sure you want to delete "${this.task().taskName}"?`)) {
      this.delete.emit(this.task().taskId);
      this.closeModal();
    }
  }

  closeModal() {
    this.closed.emit();
  }

  getFrequencyIconClass(): string {
    switch (this.task().frequency) {
      case 'Daily':
        return 'bi bi-sun-fill text-warning';
      case 'Weekly':
        return 'bi bi-calendar-week text-info';
      case 'Monthly':
        return 'bi bi-calendar3 text-success';
      default:
        return 'bi bi-list-check text-primary';
    }
  }

  getStatusClass(): string {
    const task = this.task();
    if (task.isCompleted) return 'text-success';
    if (task.isOverdue) return 'text-danger';
    return 'text-warning-emphasis';
  }

  getStatusText(): string {
    const task = this.task();
    if (task.isCompleted) return 'Completed';
    if (task.isOverdue) return 'Overdue';
    return 'Pending';
  }

  getDaysRemainingText(): string {
    const { isCompleted, daysRemaining } = this.task();
    if (isCompleted) return 'Completed';
    if (daysRemaining === undefined || daysRemaining === null) return 'No due date';

    if (daysRemaining > 0) {
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
    } else if (daysRemaining === 0) {
      return 'Due today';
    } else {
      return `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
    }
  }
}
