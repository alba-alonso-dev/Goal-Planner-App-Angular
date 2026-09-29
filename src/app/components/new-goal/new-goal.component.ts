import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDateInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-new-goal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-goal.component.html',
  styleUrls: ['./new-goal.component.css']
})
export class NewGoalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() goalCreated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  
  goalForm: FormGroup;
  submitting = false;

  constructor() {
    // Inicializar con fecha actual y próximo mes
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    this.goalForm = this.fb.group({
      goalName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      startDate: [toDateInputValue(today), Validators.required],
      endDate: [toDateInputValue(nextMonth), Validators.required],
      milestones: this.fb.array([])
    });

    // Agregar validación de fechas
    this.setupDateValidation();
  }

  private setupDateValidation() {
    this.goalForm.get('endDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
    this.goalForm.get('startDate')?.valueChanges.subscribe(() => {
      this.validateDates();
    });
  }

  private validateDates() {
    const start = this.goalForm.get('startDate')?.value;
    const end = this.goalForm.get('endDate')?.value;
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (endDate < startDate) {
        this.goalForm.get('endDate')?.setErrors({ 
          ...this.goalForm.get('endDate')?.errors, 
          endDateBeforeStart: true 
        });
      } else {
        const errors = this.goalForm.get('endDate')?.errors;
        if (errors) {
          delete errors['endDateBeforeStart'];
          if (Object.keys(errors).length === 0) {
            this.goalForm.get('endDate')?.setErrors(null);
          } else {
            this.goalForm.get('endDate')?.setErrors(errors);
          }
        }
      }
    }
  }

  get milestones() {
    return this.goalForm.get('milestones') as FormArray;
  }

  addMilestone() {
    const today = new Date();
    const milestoneForm = this.fb.group({
      milestoneName: ['', Validators.required],
      targetDate: [toDateInputValue(today), Validators.required],
      description: ['']
    });
    this.milestones.push(milestoneForm);
  }

  removeMilestone(index: number) {
    this.milestones.removeAt(index);
  }

  onSubmit() {
    if (this.goalForm.valid) {
      this.submitting = true;
      
      const formValue = this.goalForm.value;
      
      // Crear el objeto exactamente como lo espera el servicio
      const goalData = {
        goalName: formValue.goalName,
        description: formValue.description,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        milestones: formValue.milestones.map((m: any) => ({
          milestoneName: m.milestoneName,
          targetDate: m.targetDate,
          description: m.description || ''
        }))
      };

      this.goalCreated.emit(goalData);
    } else {
      // Marcar todos los campos como tocados
      Object.keys(this.goalForm.controls).forEach(key => {
        const control = this.goalForm.get(key);
        control?.markAsTouched();
      });
      
      // Marcar milestones como tocados
      this.milestones.controls.forEach(control => {
        control.markAllAsTouched();
      });
    }
  }

  closeModal() {
    this.close.emit();
  }
}