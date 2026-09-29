import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { GoalInput } from '../../model/goal';
import { toDateInputValue } from '../../shared/utils/date';

type MilestoneForm = FormGroup<{
  milestoneName: FormControl<string>;
  targetDate: FormControl<string>;
  description: FormControl<string>;
}>;

@Component({
  selector: 'app-new-goal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-goal.component.html',
  styleUrls: ['./new-goal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewGoalComponent {
  /** Lo controla el padre: true mientras se guarda el goal. */
  readonly submitting = input(false);
  readonly closed = output<void>();
  readonly goalCreated = output<GoalInput>();

  private fb = inject(FormBuilder).nonNullable;

  // Inicializar con fecha actual y próximo mes
  readonly goalForm = this.fb.group({
    goalName: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    startDate: [toDateInputValue(), Validators.required],
    endDate: [toDateInputValue(this.nextMonth()), Validators.required],
    milestones: this.fb.array<MilestoneForm>([])
  });

  constructor() {
    // Validación de fechas
    merge(this.goalForm.controls.startDate.valueChanges, this.goalForm.controls.endDate.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.validateDates());
  }

  private nextMonth(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }

  private validateDates() {
    const { startDate, endDate } = this.goalForm.getRawValue();
    const endControl = this.goalForm.controls.endDate;
    if (!startDate || !endDate) return;

    if (new Date(endDate) < new Date(startDate)) {
      endControl.setErrors({ ...endControl.errors, endDateBeforeStart: true });
    } else if (endControl.errors?.['endDateBeforeStart']) {
      const { endDateBeforeStart: _removed, ...otherErrors } = endControl.errors;
      endControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
  }

  get milestones() {
    return this.goalForm.controls.milestones;
  }

  private createMilestoneGroup(): MilestoneForm {
    return this.fb.group({
      milestoneName: ['', Validators.required],
      targetDate: [toDateInputValue(), Validators.required],
      description: ['']
    });
  }

  addMilestone() {
    this.milestones.push(this.createMilestoneGroup());
  }

  removeMilestone(index: number) {
    this.milestones.removeAt(index);
  }

  onSubmit() {
    if (this.goalForm.valid) {
      this.goalCreated.emit(this.goalForm.getRawValue());
    } else {
      // Marcar todos los campos (incluidos los milestones) como tocados
      this.goalForm.markAllAsTouched();
    }
  }

  closeModal() {
    this.closed.emit();
  }
}
