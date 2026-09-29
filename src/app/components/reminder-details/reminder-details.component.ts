import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReminderResponse } from '../../model/reminder';
import { ReminderService } from '../../services/reminder.service';
import { AuthService } from '../../services/auth.service';
import { toDateTimeInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-reminder-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reminder-details.component.html',
  styleUrls: ['./reminder-details.component.css']
})
export class ReminderDetailsComponent implements OnInit, OnChanges {
  @Input() reminder!: ReminderResponse;
  @Output() close = new EventEmitter<void>();
  @Output() reminderUpdated = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();

  private fb = inject(FormBuilder);
  private reminderService = inject(ReminderService);
  private authService = inject(AuthService);

  editMode = false;
  editForm!: FormGroup;
  submitting = false;
  error: string | null = null;

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reminder'] && !changes['reminder'].firstChange) {
      this.initForm();
    }
  }

  initForm() {
    if (!this.reminder) return;

    this.editForm = this.fb.group({
      title: [this.reminder.title, [Validators.required, Validators.minLength(3)]],
      description: [this.reminder.description || ''],
      reminderDateTime: [this.formatDateTimeForInput(this.reminder.reminderDateTime), Validators.required],
      isAcknowledged: [this.reminder.isAcknowledged]
    });

    this.setupDateTimeValidation();
  }

  private setupDateTimeValidation() {
    this.editForm.get('reminderDateTime')?.valueChanges.subscribe(() => {
      this.validateDateTime();
    });
  }

  private validateDateTime() {
    const reminderDateTime = this.editForm.get('reminderDateTime')?.value;
    
    if (reminderDateTime) {
      const reminderDate = new Date(reminderDateTime);
      const now = new Date();
      
      if (reminderDate < now) {
        this.editForm.get('reminderDateTime')?.setErrors({ 
          ...this.editForm.get('reminderDateTime')?.errors, 
          pastDate: true 
        });
      }
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
    this.editMode = !this.editMode;
    this.error = null;
    if (!this.editMode) {
      this.initForm();
    }
  }

  toggleAcknowledgement() {
    this.submitting = true;
    this.reminderService.toggleReminderAcknowledgement(this.reminder).subscribe({
      next: () => {
        this.submitting = false;
        this.reminderUpdated.emit();
        this.loadUpdatedReminder();
      },
      error: (error) => {
        this.error = error.message || 'Error updating reminder';
        this.submitting = false;
      }
    });
  }

  saveChanges() {
    if (this.editForm.valid) {
      this.submitting = true;
      this.error = null;

      const formValue = this.editForm.value;
      
      const updatedReminder = {
        title: formValue.title,
        description: formValue.description,
        reminderDateTime: new Date(formValue.reminderDateTime).toISOString(),
        isAcknowledged: formValue.isAcknowledged
      };

      this.reminderService.updateReminder(this.reminder.reminderId, updatedReminder).subscribe({
        next: (response) => {
          this.submitting = false;
          this.editMode = false;
          this.reminderUpdated.emit();
          this.loadUpdatedReminder();
        },
        error: (error) => {
          this.error = error.message || 'Error updating reminder';
          this.submitting = false;
        }
      });
    } else {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteReminder() {
    if (confirm(`Are you sure you want to delete "${this.reminder.title}"?`)) {
      this.delete.emit(this.reminder.reminderId);
      this.closeModal();
    }
  }

  private loadUpdatedReminder() {
    this.reminderService.getReminderById(this.reminder.reminderId).subscribe({
      next: (updatedReminder) => {
        this.reminder = updatedReminder;
        this.initForm();
      },
      error: (error) => {
        console.error('Error loading updated reminder:', error);
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  getStatusIcon(): string {
    if (this.reminder.isAcknowledged) return 'fas fa-check-circle text-success';
    if (this.reminder.isOverdue) return 'fas fa-exclamation-circle text-danger';
    if (this.reminder.isToday) return 'fas fa-bell text-warning';
    if (this.reminder.isTomorrow) return 'fas fa-clock text-info';
    return 'fas fa-bell text-primary';
  }

  getStatusText(): string {
    if (this.reminder.isAcknowledged) return 'Acknowledged';
    if (this.reminder.isOverdue) return 'Overdue';
    if (this.reminder.isToday) return 'Today';
    if (this.reminder.isTomorrow) return 'Tomorrow';
    return 'Upcoming';
  }

  getStatusClass(): string {
    if (this.reminder.isAcknowledged) return 'bg-success';
    if (this.reminder.isOverdue) return 'bg-danger';
    if (this.reminder.isToday) return 'bg-warning';
    if (this.reminder.isTomorrow) return 'bg-info';
    return 'bg-primary';
  }
}