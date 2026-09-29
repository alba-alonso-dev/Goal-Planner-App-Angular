import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoalItemComponent } from '../goal-item/goal-item.component';
import { NewGoalComponent } from '../new-goal/new-goal.component';
import { GoalDetailsComponent } from '../goal-details/goal-details.component';
import { GoalService } from '../../services/goal.service';
import { GoalResponse } from '../../model/goal';
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
  styleUrls: ['./goal-list.component.css']
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

  showNewGoalModal = false;
  showDetailsModal = false;
  selectedGoal: GoalResponse | null = null;
  loading = false;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid'; // Para cambiar vista

  ngOnInit() {
    this.loadGoals();
  }

  loadGoals() {
    this.loading = true;
    this.error = null;
    
    this.goalService.getAllGoalsByUser().subscribe({
      next: (goals) => {
        this.allGoals.set(goals);
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
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
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  isOverdue(goal: GoalResponse): boolean {
    if (goal.isAchieved) return false;
    const today = new Date();
    const endDate = new Date(goal.endDate);
    return endDate < today;
  }

  openNewGoalModal() {
    this.showNewGoalModal = true;
  }

  closeNewGoalModal() {
    this.showNewGoalModal = false;
  }

  onGoalCreated(goalData: any) {
    this.loading = true;
    
    this.goalService.createGoalWithMilestones(goalData).subscribe({
      next: (response) => {
        this.loadGoals();
        this.closeNewGoalModal();
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error creating goal:', error);
      }
    });
  }

  onGoalUpdated() {
    this.loadGoals();
  }

  viewGoalDetails(goal: GoalResponse) {
    if (!goal.goalId) return;
    
    this.loading = true;
    
    this.goalService.getGoalById(goal.goalId).subscribe({
      next: (goalDetails) => {
        this.selectedGoal = goalDetails;
        this.showDetailsModal = true;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error loading goal details:', error);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedGoal = null;
  }

  retry() {
    this.loadGoals();
  }

  // Método para archivar/eliminar goals completados TODO
  archiveCompletedGoals() {
    const completedGoals = this.allGoals().filter(g => g.isAchieved);
    
    if (completedGoals.length === 0) {
      this.notificationService.info('No completed goals to archive', 'Info');
      return;
    }
    
    if (confirm(`Are you sure you want to archive ${completedGoals.length} completed goal(s)?`)) {
      const activeGoals = this.allGoals().filter(g => !g.isAchieved);
      this.allGoals.set(activeGoals);
      
      this.notificationService.success(`Archived ${completedGoals.length} goals`, 'Success');
    }
  }
}