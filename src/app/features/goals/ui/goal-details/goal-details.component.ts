import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { GoalView, MilestoneInput, MilestoneResponse } from '../../goal.model';
import { GoalStore } from '../../data-access/goal.store';
import { resolveAchieved } from '../../domain/goal.rules';
import { ApiError } from '../../../../core/http/api-error';
import { toDateInputValue } from '../../../../shared/utils/date';
import { dateOrderValidator, milestonesWithinRangeValidator } from '../../../../shared/forms/date-validators';

import { DialogDirective } from '../../../../shared/ui/dialog.directive';

@Component({
  selector: 'app-goal-details',
  standalone: true,
  imports: [DialogDirective, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './goal-details.component.html',
  styleUrls: ['./goal-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalDetailsComponent {
  /** El padre lo obtiene del store, así que refleja siempre el último estado guardado. */
  readonly goal = input.required<GoalView>();
  readonly closed = output<void>();
  readonly goalUpdated = output<void>();

  private fb = inject(FormBuilder);
  private store = inject(GoalStore);

  readonly editMode = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly editForm = this.fb.group(
    {
      goalId: [0],
      goalName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      isAchieved: [false],
      milestones: this.fb.array<FormGroup>([])
    },
    {
      validators: [
        dateOrderValidator('startDate', 'endDate', 'endDateBeforeStart'),
        milestonesWithinRangeValidator('startDate', 'endDate', 'milestones')
      ]
    }
  );

  constructor() {
    // Rellenar el formulario cuando cambia el goal, salvo mientras se está editando
    effect(() => {
      const goal = this.goal();
      untracked(() => {
        if (!this.editMode()) this.initForm(goal);
      });
    });

    // Con milestones, "conseguido" se deriva de ellos: la casilla se sincroniza y se desactiva
    this.milestonesArray.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncAchieved());
  }

  private initForm(goal: GoalView) {
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
    goal.milestones.forEach(milestone => {
      this.milestonesArray.push(this.createMilestoneFormGroup(milestone), { emitEvent: false });
    });
    this.syncAchieved();
  }

  private syncAchieved() {
    const milestones = this.milestonesArray.getRawValue() as MilestoneInput[];
    const achieved = this.editForm.controls.isAchieved;
    if (milestones.length > 0) {
      achieved.setValue(resolveAchieved(milestones, false), { emitEvent: false });
      achieved.disable({ emitEvent: false });
    } else {
      achieved.enable({ emitEvent: false });
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
      this.initForm(this.goal());
    }
  }

  /** En modo vista: optimista, el progreso cambia al momento y se revierte si falla. */
  toggleMilestoneCompletion(index: number) {
    if (this.editMode()) return;
    const milestone = this.goal().milestones[index];
    if (!milestone) return;

    this.error.set(null);
    this.store.toggleMilestone(this.goal().goalId, milestone.milestoneId).subscribe({
      next: () => this.goalUpdated.emit(),
      error: (error: ApiError) => this.error.set(error.message || 'Error al actualizar el milestone')
    });
  }

  saveChanges() {
    if (this.editForm.valid) {
      this.save();
    } else {
      // Marcar campos inválidos
      this.editForm.markAllAsTouched();
    }
  }

  private save() {
    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.editForm.getRawValue();

    this.store
      .update(this.goal().goalId, {
        goalName: formValue.goalName ?? '',
        description: formValue.description ?? '',
        startDate: formValue.startDate ?? '',
        endDate: formValue.endDate ?? '',
        isAchieved: formValue.isAchieved ?? false,
        milestones: formValue.milestones as MilestoneInput[]
      })
      .subscribe({
        next: () => {
          // El store ya tiene el goal actualizado (con los ids de los milestones nuevos)
          this.submitting.set(false);
          this.editMode.set(false);
          this.goalUpdated.emit();
        },
        error: (error: ApiError) => {
          this.error.set(error.message || 'Error al actualizar el goal');
          this.submitting.set(false);
          console.error('Error updating goal:', error);
        }
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

  /** Días naturales hasta la fecha objetivo (negativo si ya pasó). */
  getDaysRemaining(): number {
    return this.goal().daysRemaining;
  }
}
