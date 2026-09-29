import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoalItemComponent } from '../ui/goal-item/goal-item.component';
import { NewGoalComponent } from '../ui/new-goal/new-goal.component';
import { GoalDetailsComponent } from '../ui/goal-details/goal-details.component';
import { GoalStore } from '../data-access/goal.store';
import { selectGoals } from '../domain/goal.rules';
import { GoalFilter, GoalInput, GoalView } from '../goal.model';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notifications/notification.service';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    GoalItemComponent,
    NewGoalComponent,
    GoalDetailsComponent
  ],
  templateUrl: './goal-list.component.html',
  styleUrls: ['./goal-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalListComponent implements OnInit {
  private store = inject(GoalStore);
  private notificationService = inject(NotificationService);

  readonly filter = signal<GoalFilter>('all');
  private readonly searchTerm = signal('');

  // Estado compartido: vive en el store
  readonly stats = this.store.stats;
  readonly loading = this.store.loading;
  readonly error = this.store.error;

  readonly filteredGoals = computed(() =>
    selectGoals(this.store.goals(), { filter: this.filter(), search: this.searchTerm() })
  );

  readonly showNewGoalModal = signal(false);
  readonly creating = signal(false);
  readonly viewMode = signal<'grid' | 'list'>('grid'); // Para cambiar vista
  // Se guarda el id (no el objeto) para que el detalle refleje siempre el estado actual del store
  private readonly selectedGoalId = signal<number | null>(null);
  readonly selectedGoal = computed(() => this.store.goals().find(g => g.goalId === this.selectedGoalId()) ?? null);
  readonly showDetailsModal = computed(() => this.selectedGoal() !== null);

  ngOnInit() {
    // Usa los datos en memoria si ya se cargaron (p. ej. desde el dashboard)
    this.store.load();
  }

  setFilter(filter: GoalFilter) {
    this.filter.set(filter);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  toggleViewMode() {
    this.viewMode.update(mode => (mode === 'grid' ? 'list' : 'grid'));
  }

  isOverdue(goal: GoalView): boolean {
    return goal.isOverdue;
  }

  openNewGoalModal() {
    this.showNewGoalModal.set(true);
  }

  closeNewGoalModal() {
    this.showNewGoalModal.set(false);
  }

  onGoalCreated(goalData: GoalInput) {
    this.creating.set(true);

    this.store.create(goalData).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewGoalModal();
        this.notificationService.success('Goal created successfully', 'Success');
      },
      error: (error: ApiError) => {
        // El modal sigue abierto para poder reintentar sin perder los datos
        this.creating.set(false);
        this.notificationService.error(error.message, 'Error creating goal');
      }
    });
  }

  onGoalUpdated() {
    this.notificationService.success('Goal updated successfully', 'Success');
  }

  /** Abre el detalle al momento y trae los milestones en segundo plano (el listado no los incluye). */
  viewGoalDetails(goal: GoalView) {
    this.selectedGoalId.set(goal.goalId);
    this.store.loadDetails(goal.goalId).subscribe({
      error: (error: ApiError) => this.notificationService.error(error.message, 'Error loading goal details')
    });
  }

  closeDetailsModal() {
    this.selectedGoalId.set(null);
  }

  retry() {
    this.store.load({ force: true });
  }
}
