import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { GoalResponse, MilestoneResponse } from '../../model/goal';
import { GoalService } from '../../services/goal.service';
import { AuthService } from '../../services/auth.service';
import { toDateInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-goal-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './goal-details.component.html',
  styleUrls: ['./goal-details.component.css']
})
export class GoalDetailsComponent implements OnInit, OnChanges {
  @Input() goal!: GoalResponse;
  @Output() close = new EventEmitter<void>();
  @Output() goalUpdated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private goalService = inject(GoalService);
  private authService = inject(AuthService);

  editMode = false;
  editForm!: FormGroup;
  submitting = false;
  error: string | null = null;

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['goal'] && !changes['goal'].firstChange) {
      this.initForm();
    }
  }

  initForm() {
    if (!this.goal) return;

    this.editForm = this.fb.group({
      goalId: [this.goal.goalId],
      goalName: [this.goal.goalName, [Validators.required, Validators.minLength(3)]],
      description: [this.goal.description || ''],
      startDate: [this.formatDateForInput(this.goal.startDate), Validators.required],
      endDate: [this.formatDateForInput(this.goal.endDate), Validators.required],
      isAchieved: [this.goal.isAchieved],
      milestones: this.fb.array([])
    });

    // Cargar milestones existentes
    this.loadMilestonesToForm();
  }

  private loadMilestonesToForm() {
    const milestonesArray = this.editForm.get('milestones') as FormArray;
    milestonesArray.clear();
    
    if (this.goal.milestones && this.goal.milestones.length > 0) {
      this.goal.milestones.forEach(milestone => {
        milestonesArray.push(this.createMilestoneFormGroup(milestone));
      });
    }
  }

  private createMilestoneFormGroup(milestone: MilestoneResponse): FormGroup {
    return this.fb.group({
      milestoneId: [milestone.milestoneId],
      milestoneName: [milestone.milestoneName, Validators.required],
      targetDate: [this.formatDateForInput(milestone.targetDate), Validators.required],
      description: [milestone.description || ''],
      isCompleted: [milestone.isCompleted]
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

  get milestonesArray() {
    return this.editForm.get('milestones') as FormArray;
  }

  addNewMilestone() {
    const today = new Date();
    const milestoneForm = this.fb.group({
      milestoneId: [0],
      milestoneName: ['', Validators.required],
      targetDate: [toDateInputValue(today), Validators.required],
      description: [''],
      isCompleted: [false]
    });
    this.milestonesArray.push(milestoneForm);
  }

  removeMilestone(index: number) {
    this.milestonesArray.removeAt(index);
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.error = null;
    if (!this.editMode) {
      // Si cancelamos, revertimos los cambios
      this.initForm();
    }
  }

  toggleMilestoneCompletion(index: number) {
    if (!this.editMode) {
      const milestone = this.milestonesArray.at(index);
      const currentValue = milestone.get('isCompleted')?.value;
      milestone.get('isCompleted')?.setValue(!currentValue);
      this.saveMilestoneToggle();
    }
  }

  saveMilestoneToggle() {
    if (!this.editForm.valid) return;
    
    this.submitting = true;
    
    const user = this.authService.loggedUser();
    if (!user) {
      this.error = 'Usuario no autenticado';
      this.submitting = false;
      return;
    }

    const formValue = this.editForm.value;
    
    // Asegurar que las fechas estén en formato ISO
    const updatedGoal = {
      goalId: formValue.goalId,
      goalName: formValue.goalName,
      description: formValue.description || '',
      startDate: new Date(formValue.startDate).toISOString(),
      endDate: new Date(formValue.endDate).toISOString(),
      isAchieved: formValue.isAchieved,
      userId: user.userId, // Usar el userId del usuario autenticado
      milestones: formValue.milestones.map((m: any) => ({
        milestoneId: m.milestoneId,
        milestoneName: m.milestoneName,
        description: m.description || '',
        targetDate: new Date(m.targetDate).toISOString(),
        isCompleted: m.isCompleted
      }))
    };

    this.goalService.updateGoalWithMilestones(this.goal.goalId, updatedGoal).subscribe({
      next: (response) => {
        this.submitting = false;
        this.goalUpdated.emit();
        this.loadUpdatedGoal();
      },
      error: (error) => {
        this.error = error.message || 'Error al actualizar el milestone';
        this.submitting = false;
        console.error('Error updating milestone:', error);
      }
    });
  }

  saveChanges() {
    if (this.editForm.valid) {
      this.submitting = true;
      this.error = null;
      
      const user = this.authService.loggedUser();
      if (!user) {
        this.error = 'Usuario no autenticado';
        this.submitting = false;
        return;
      }

      const formValue = this.editForm.value;
      
      // Asegurar que las fechas estén en formato ISO
      const updatedGoal = {
        goalId: formValue.goalId,
        goalName: formValue.goalName,
        description: formValue.description || '',
        startDate: new Date(formValue.startDate).toISOString(),
        endDate: new Date(formValue.endDate).toISOString(),
        isAchieved: formValue.isAchieved,
        userId: user.userId, // Usar el userId del usuario autenticado
        milestones: formValue.milestones.map((m: any) => ({
          milestoneId: m.milestoneId,
          milestoneName: m.milestoneName,
          description: m.description || '',
          targetDate: new Date(m.targetDate).toISOString(),
          isCompleted: m.isCompleted
        }))
      };

      this.goalService.updateGoalWithMilestones(this.goal.goalId, updatedGoal).subscribe({
        next: (response) => {
          this.submitting = false;
          this.editMode = false;
          this.goalUpdated.emit();
          this.loadUpdatedGoal();
        },
        error: (error) => {
          this.error = error.message || 'Error al actualizar el goal';
          this.submitting = false;
          console.error('Error updating goal:', error);
        }
      });
    } else {
      // Marcar campos inválidos
      Object.keys(this.editForm.controls).forEach(key => {
        const control = this.editForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  private loadUpdatedGoal() {
    this.goalService.getGoalById(this.goal.goalId).subscribe({
      next: (updatedGoal) => {
        this.goal = updatedGoal;
        this.initForm();
      },
      error: (error) => {
        console.error('Error loading updated goal:', error);
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  getProgressColor(progress: number = 0): string {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'danger';
  }

  getDaysRemaining(): number {
    if (!this.goal?.endDate) return 0;
    const today = new Date();
    const endDate = new Date(this.goal.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}