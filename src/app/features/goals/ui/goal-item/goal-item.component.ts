// goal-item.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GoalResponse } from '../../goal.model';

@Component({
  selector: 'app-goal-item',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './goal-item.component.html',
  styleUrls: ['./goal-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalItemComponent {
  readonly goal = input.required<GoalResponse>();
  readonly viewDetails = output<GoalResponse>();

  onViewDetails() {
    this.viewDetails.emit(this.goal());
  }

  getProgressColor(progress = 0): string {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'danger';
  }
}
