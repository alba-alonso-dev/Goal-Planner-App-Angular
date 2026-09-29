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
import { merge } from 'rxjs';
import { TaskResponse } from '../../model/task';
import { TaskService } from '../../services/task.service';
import { ApiError } from '../../core/http/api-error';
import { toDateInputValue } from '../../shared/utils/date';

type Frequency = TaskResponse['frequency'];

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailsComponent {
  readonly task = input.required<TaskResponse>();
  readonly closed = output<void>();
  readonly taskUpdated = output<void>();
  readonly delete = output<number>();

  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);

  // Copia local de la tarea: parte del input y se sustituye tras guardar cambios
  readonly currentTask = linkedSignal(() => this.task());

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly frequencies: { value: Frequency; label: string }[] = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  readonly editForm = this.fb.nonNullable.group({
    taskName: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    frequency: ['Daily' as Frequency, Validators.required],
    startDate: ['', Validators.required],
    dueDate: ['', Validators.required],
    isCompleted: [false]
  });

  constructor() {
    // Rellenar el formulario cada vez que cambia la tarea (input o recarga tras guardar)
    effect(() => {
      const task = this.currentTask();
      untracked(() => this.initForm(task));
    });

    merge(this.editForm.controls.startDate.valueChanges, this.editForm.controls.dueDate.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.validateDates());
  }

  private initForm(task: TaskResponse) {
    this.editForm.reset({
      taskName: task.taskName,
      description: task.description || '',
      frequency: task.frequency,
      startDate: this.formatDateForInput(task.startDate),
      dueDate: this.formatDateForInput(task.dueDate),
      isCompleted: task.isCompleted
    });
  }

  private validateDates() {
    const { startDate, dueDate } = this.editForm.getRawValue();
    const dueControl = this.editForm.controls.dueDate;

    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      dueControl.setErrors({ ...dueControl.errors, dueDateBeforeStart: true });
    }
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
      this.initForm(this.currentTask());
    }
  }

  toggleCompletion() {
    this.submitting.set(true);
    this.taskService.toggleTaskCompletion(this.currentTask()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.taskUpdated.emit();
        this.loadUpdatedTask();
      },
      error: (error: ApiError) => {
        this.error.set(error.message || 'Error updating task');
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

    this.taskService
      .updateTask(this.currentTask().taskId, {
        ...this.editForm.getRawValue(),
        createdDate: this.currentTask().createdDate
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.editMode.set(false);
          this.taskUpdated.emit();
          this.loadUpdatedTask();
        },
        error: (error: ApiError) => {
          this.error.set(error.message || 'Error updating task');
          this.submitting.set(false);
        }
      });
  }

  deleteTask() {
    if (confirm(`Are you sure you want to delete "${this.currentTask().taskName}"?`)) {
      this.delete.emit(this.currentTask().taskId);
      this.closeModal();
    }
  }

  private loadUpdatedTask() {
    this.taskService.getTaskById(this.currentTask().taskId).subscribe({
      next: updatedTask => this.currentTask.set(updatedTask),
      error: error => console.error('Error loading updated task:', error)
    });
  }

  closeModal() {
    this.closed.emit();
  }

  getFrequencyIconClass(): string {
    switch (this.currentTask().frequency) {
      case 'Daily':
        return 'fas fa-sun text-warning';
      case 'Weekly':
        return 'fas fa-calendar-week text-info';
      case 'Monthly':
        return 'fas fa-calendar-alt text-success';
      default:
        return 'fas fa-tasks text-primary';
    }
  }

  getStatusClass(): string {
    const task = this.currentTask();
    if (task.isCompleted) return 'text-success';
    if (task.isOverdue) return 'text-danger';
    return 'text-warning';
  }

  getStatusText(): string {
    const task = this.currentTask();
    if (task.isCompleted) return 'Completed';
    if (task.isOverdue) return 'Overdue';
    return 'Pending';
  }

  getDaysRemainingText(): string {
    const { isCompleted, daysRemaining } = this.currentTask();
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
