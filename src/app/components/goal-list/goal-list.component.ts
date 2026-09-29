import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoalItemComponent } from '../goal-item/goal-item.component';
import { NewGoalComponent } from '../new-goal/new-goal.component';
import { GoalDetailsComponent } from '../goal-details/goal-details.component';
import { GoalService } from '../../services/goal.service';
import { GoalInput, GoalResponse } from '../../model/goal';
import { ApiError } from '../../core/http/api-error';
import { NotificationService } from '../../services/notification.service';

type FilterType = 'all' | 'active' | 'completed' | 'overdue';

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
  private goalService = inject(GoalService);
  private notificationService = inject(NotificationService);
  
  // Signals para mejor reactividad
  private allGoals = signal<GoalResponse[]>([]);
  filter = signal<FilterType>('all');
  private searchTerm = signal('');
  
  // Computed signals para los goals filtrados
  filteredGoals = computed(() => {
    let goals = this.allGoals();
    
    // Aplicar filtro por estado
    switch (this.filter()) {
      case 'active':
        goals = goals.filter(g => !g.isAchieved && !this.isOverdue(g));
        break;
      case 'completed':
        goals = goals.filter(g => g.isAchieved);
        break;
      case 'overdue':
        goals = goals.filter(g => !g.isAchieved && this.isOverdue(g));
        break;
      default: // 'all'
        break;
    }
    
    // Aplicar búsqueda por texto
    const search = this.searchTerm().toLowerCase();
    if (search) {
      goals = goals.filter(g => 
        g.goalName.toLowerCase().includes(search) || 
        g.description?.toLowerCase().includes(search)
      );
    }
    
    return goals;
  });
  
  // Estadísticas
  stats = computed(() => {
    const goals = this.allGoals();
    return {
      total: goals.length,
      completed: goals.filter(g => g.isAchieved).length,
      active: goals.filter(g => !g.isAchieved && !this.isOverdue(g)).length,
      overdue: goals.filter(g => !g.isAchieved && this.isOverdue(g)).length
    };
  });

  readonly showNewGoalModal = signal(false);
  readonly showDetailsModal = signal(false);
  readonly selectedGoal = signal<GoalResponse | null>(null);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly viewMode = signal<'grid' | 'list'>('grid'); // Para cambiar vista

  ngOnInit() {
    this.loadGoals();
  }

  loadGoals() {
    this.loading.set(true);
    this.error.set(null);
    
    this.goalService.getAllGoalsByUser().subscribe({
      next: (goals) => {
        this.allGoals.set(goals);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
        console.error('Error loading goals:', error);
      }
    });
  }

  setFilter(filter: FilterType) {
    this.filter.set(filter);
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  toggleViewMode() {
    this.viewMode.update(mode => (mode === 'grid' ? 'list' : 'grid'));
  }

  isOverdue(goal: GoalResponse): boolean {
    if (goal.isAchieved) return false;
    const today = new Date();
    const endDate = new Date(goal.endDate);
    return endDate < today;
  }

  openNewGoalModal() {
    this.showNewGoalModal.set(true);
  }

  closeNewGoalModal() {
    this.showNewGoalModal.set(false);
  }

  onGoalCreated(goalData: GoalInput) {
    this.creating.set(true);

    this.goalService.createGoalWithMilestones(goalData).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeNewGoalModal();
        this.loadGoals();
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
    this.loadGoals();
  }

  viewGoalDetails(goal: GoalResponse) {
    if (!goal.goalId) return;
    
    this.loading.set(true);
    
    this.goalService.getGoalById(goal.goalId).subscribe({
      next: (goalDetails) => {
        this.selectedGoal.set(goalDetails);
        this.showDetailsModal.set(true);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.loading.set(false);
        this.notificationService.error(error.message, 'Error loading goal details');
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedGoal.set(null);
  }

  retry() {
    this.loadGoals();
  }
}
