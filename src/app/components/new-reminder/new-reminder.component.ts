import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDateTimeInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-new-reminder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-reminder.component.html',
  styleUrls: ['./new-reminder.component.css']
})
export class NewReminderComponent {
  @Output() close = new EventEmitter<void>();
  @Output() reminderCreated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  
  reminderForm: FormGroup;
  submitting = false;

  constructor() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1);

    this.reminderForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      reminderDateTime: [toDateTimeInputValue(nextHour), Validators.required]
    });

    this.setupDateTimeValidation();
  }

  private setupDateTimeValidation() {
    this.reminderForm.get('reminderDateTime')?.valueChanges.subscribe(() => {
      this.validateDateTime();
    });
  }

  private validateDateTime() {
    const reminderDateTime = this.reminderForm.get('reminderDateTime')?.value;
    
    if (reminderDateTime) {
      const reminderDate = new Date(reminderDateTime);
      const now = new Date();
      
      if (reminderDate < now) {
        this.reminderForm.get('reminderDateTime')?.setErrors({ 
          ...this.reminderForm.get('reminderDateTime')?.errors, 
          pastDate: true 
        });
      } else {
        const errors = this.reminderForm.get('reminderDateTime')?.errors;
        if (errors) {
          delete errors['pastDate'];
          if (Object.keys(errors).length === 0) {
            this.reminderForm.get('reminderDateTime')?.setErrors(null);
          } else {
            this.reminderForm.get('reminderDateTime')?.setErrors(errors);
          }
        }
      }
    }
  }

  onSubmit() {
    if (this.reminderForm.valid) {
      this.submitting = true;
      
      const formValue = this.reminderForm.value;
      
      const reminderData = {
        title: formValue.title,
        description: formValue.description,
        reminderDateTime: formValue.reminderDateTime
      };

      this.reminderCreated.emit(reminderData);
    } else {
      Object.keys(this.reminderForm.controls).forEach(key => {
        const control = this.reminderForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  closeModal() {
    this.close.emit();
  }
}