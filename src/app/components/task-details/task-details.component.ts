import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskResponse } from '../../model/task';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { toDateInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css']
})
export class TaskDetailsComponent implements OnInit, OnChanges {
  @Input() task!: TaskResponse;
  @Output() close = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  editMode = false;
  editForm!: FormGroup;
  submitting = false;
  error: string | null = null;

  frequencies = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['task'] && !changes['task'].firstChange) {
      this.initForm();
    }
  }

  initForm() {
    if (!this.task) return;

    this.editForm = this.fb.group({
      taskName: [this.task.taskName, [Validators.required, Validators.minLength(3)]],
      description: [this.task.description || ''],
      frequency: [this.task.frequency, Validators.required],
      startDate: [this.formatDateForInput(this.task.startDate), Validators.required],
      dueDate: [this.formatDateForInput(this.task.dueDate), Validators.required],
      isCompleted: [this.task.isCompleted]
    });

    this.setupDateValidation();
  }

  private setupDateValidation() {
    this.editForm.get('dueDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
    this.editForm.get('startDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
  }

  private validateDates() {
    const start = this.editForm.get('startDate')?.value;
    const due = this.editForm.get('dueDate')?.value;
    
    if (start && due) {
      const startDate = new Date(start);
      const dueDate = new Date(due);
      
      if (dueDate < startDate) {
        this.editForm.get('dueDate')?.setErrors({ 
          ...this.editForm.get('dueDate')?.errors, 
          dueDateBeforeStart: true 
        });
      }
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
    this.editMode = !this.editMode;
    this.error = null;
    if (!this.editMode) {
      this.initForm();
    }
  }

  toggleCompletion() {
    this.submitting = true;
    this.taskService.toggleTaskCompletion(this.task).subscribe({
      next: () => {
        this.submitting = false;
        this.taskUpdated.emit();
        this.loadUpdatedTask();
      },
      error: (error) => {
        this.error = error.message || 'Error updating task';
        this.submitting = false;
      }
    });
  }

  saveChanges() {
    if (this.editForm.valid) {
      this.submitting = true;
      this.error = null;

      const formValue = this.editForm.value;
      
      const updatedTask = {
        taskName: formValue.taskName,
        description: formValue.description,
        frequency: formValue.frequency,
        startDate: new Date(formValue.startDate).toISOString(),
        dueDate: new Date(formValue.dueDate).toISOString(),
        isCompleted: formValue.isCompleted,
        createdDate: this.task.createdDate
      };

      this.taskService.updateTask(this.task.taskId, updatedTask).subscribe({
        next: (response) => {
          this.submitting = false;
          this.editMode = false;
          this.taskUpdated.emit();
          this.loadUpdatedTask();
        },
        error: (error) => {
          this.error = error.message || 'Error updating task';
          this.submitting = false;
        }
      });
    } else {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteTask() {
    if (confirm(`Are you sure you want to delete "${this.task.taskName}"?`)) {
      this.delete.emit(this.task.taskId);
      this.closeModal();
    }
  }

  private loadUpdatedTask() {
    this.taskService.getTaskById(this.task.taskId).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.initForm();
      },
      error: (error) => {
        console.error('Error loading updated task:', error);
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  getFrequencyIconClass(): string {
    switch(this.task.frequency) {
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
    if (this.task.isCompleted) return 'text-success';
    if (this.task.isOverdue) return 'text-danger';
    return 'text-warning';
  }

  getStatusText(): string {
    if (this.task.isCompleted) return 'Completed';
    if (this.task.isOverdue) return 'Overdue';
    return 'Pending';
  }

  getDaysRemainingText(): string {
    if (this.task.isCompleted) return 'Completed';
    if (!this.task.daysRemaining) return 'No due date';
    
    if (this.task.daysRemaining > 0) {
      return `${this.task.daysRemaining} day${this.task.daysRemaining !== 1 ? 's' : ''} remaining`;
    } else if (this.task.daysRemaining === 0) {
      return 'Due today';
    } else {
      return `Overdue by ${Math.abs(this.task.daysRemaining)} day${Math.abs(this.task.daysRemaining) !== 1 ? 's' : ''}`;
    }
  }
}