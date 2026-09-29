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
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { GoalResponse, MilestoneInput, MilestoneResponse } from '../../model/goal';
import { GoalService } from '../../services/goal.service';
import { ApiError } from '../../core/http/api-error';
import { toDateInputValue } from '../../shared/utils/date';

@Component({
  selector: 'app-goal-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './goal-details.component.html',
  styleUrls: ['./goal-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalDetailsComponent {
  readonly goal = input.required<GoalResponse>();
  readonly closed = output<void>();
  readonly goalUpdated = output<void>();

  private fb = inject(FormBuilder);
  private goalService = inject(GoalService);

  // Copia local del goal: parte del input y se sustituye tras guardar cambios
  readonly currentGoal = linkedSignal(() => this.goal());

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly editForm = this.fb.group({
    goalId: [0],
    goalName: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    isAchieved: [false],
    milestones: this.fb.array<FormGroup>([])
  });

  constructor() {
    // Rellenar el formulario cada vez que cambia el goal (input o recarga tras guardar)
    effect(() => {
      const goal = this.currentGoal();
      untracked(() => this.initForm(goal));
    });
  }

  private initForm(goal: GoalResponse) {
    this.editForm.reset({
      goalId: goal.goalId,
      goalName: goal.goalName,
      description: goal.description || '',
      startDate: this.formatDateForInput(goal.startDate),
      endDate: this.formatDateForInput(goal.endDate),
      isAchieved: goal.isAchieved
    });

    // Cargar milestones existentes
    this.milestonesArray.clear();
    (goal.milestones ?? []).forEach(milestone => {
      this.milestonesArray.push(this.createMilestoneFormGroup(milestone));
    });
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
    return this.editForm.controls.milestones as FormArray<FormGroup>;
  }

  addNewMilestone() {
    this.milestonesArray.push(
      this.fb.group({
        milestoneId: [0],
        milestoneName: ['', Validators.required],
        targetDate: [toDateInputValue(), Validators.required],
        description: [''],
        isCompleted: [false]
      })
    );
  }

  removeMilestone(index: number) {
    this.milestonesArray.removeAt(index);
  }

  toggleEditMode() {
    this.editMode.update(value => !value);
    this.error.set(null);
    if (!this.editMode()) {
      // Si cancelamos, revertimos los cambios
      this.initForm(this.currentGoal());
    }
  }

  toggleMilestoneCompletion(index: number) {
    if (!this.editMode()) {
      const isCompleted = this.milestonesArray.at(index).get('isCompleted');
      isCompleted?.setValue(!isCompleted.value);
      this.save('Error al actualizar el milestone');
    }
  }

  saveChanges() {
    if (this.editForm.valid) {
      this.save('Error al actualizar el goal');
    } else {
      // Marcar campos inválidos
      this.editForm.markAllAsTouched();
    }
  }

  private save(fallbackError: string) {
    if (!this.editForm.valid) return;

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.editForm.getRawValue();

    this.goalService
      .updateGoalWithMilestones(this.currentGoal().goalId, {
        goalName: formValue.goalName ?? '',
        description: formValue.description ?? '',
        startDate: formValue.startDate ?? '',
        endDate: formValue.endDate ?? '',
        isAchieved: formValue.isAchieved ?? false,
        milestones: formValue.milestones as MilestoneInput[]
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.editMode.set(false);
          this.goalUpdated.emit();
          this.loadUpdatedGoal();
        },
        error: (error: ApiError) => {
          this.error.set(error.message || fallbackError);
          this.submitting.set(false);
          console.error('Error updating goal:', error);
        }
      });
  }

  private loadUpdatedGoal() {
    this.goalService.getGoalById(this.currentGoal().goalId).subscribe({
      next: updatedGoal => this.currentGoal.set(updatedGoal),
      error: error => console.error('Error loading updated goal:', error)
    });
  }

  closeModal() {
    this.closed.emit();
  }

  getProgressColor(progress = 0): string {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'danger';
  }

  getDaysRemaining(): number {
    const endDate = this.currentGoal().endDate;
    if (!endDate) return 0;
    const diffTime = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
