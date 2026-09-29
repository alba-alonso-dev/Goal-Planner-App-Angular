import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDateInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-new-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.css']
})
export class NewTaskComponent {
  @Output() close = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  
  taskForm: FormGroup;
  submitting = false;

  frequencies = [
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' }
  ];

  constructor() {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.taskForm = this.fb.group({
      taskName: ['', [Validators.required, Validators.minLength(3)]],
      frequency: ['Daily', Validators.required],
      startDate: [toDateInputValue(today), Validators.required],
      dueDate: [toDateInputValue(nextWeek), Validators.required],
      description: ['']
    });

    this.setupDateValidation();
  }

  private setupDateValidation() {
    this.taskForm.get('dueDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
    this.taskForm.get('startDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
  }

  private validateDates() {
    const start = this.taskForm.get('startDate')?.value;
    const due = this.taskForm.get('dueDate')?.value;
    
    if (start && due) {
      const startDate = new Date(start);
      const dueDate = new Date(due);
      
      if (dueDate < startDate) {
        this.taskForm.get('dueDate')?.setErrors({ 
          ...this.taskForm.get('dueDate')?.errors, 
          dueDateBeforeStart: true 
        });
      } else {
        const errors = this.taskForm.get('dueDate')?.errors;
        if (errors) {
          delete errors['dueDateBeforeStart'];
          if (Object.keys(errors).length === 0) {
            this.taskForm.get('dueDate')?.setErrors(null);
          } else {
            this.taskForm.get('dueDate')?.setErrors(errors);
          }
        }
      }
    }
  }

  onSubmit() {
    if (this.taskForm.valid) {
      this.submitting = true;
      
      const formValue = this.taskForm.value;
      
      const taskData = {
        taskName: formValue.taskName,
        description: formValue.description,
        frequency: formValue.frequency,
        startDate: formValue.startDate,
        dueDate: formValue.dueDate
      };

      this.taskCreated.emit(taskData);
    } else {
      Object.keys(this.taskForm.controls).forEach(key => {
        const control = this.taskForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  closeModal() {
    this.close.emit();
  }
}