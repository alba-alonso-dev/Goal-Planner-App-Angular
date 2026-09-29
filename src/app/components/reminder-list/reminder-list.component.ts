import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReminderItemComponent } from '../reminder-item/reminder-item.component';
import { NewReminderComponent } from '../new-reminder/new-reminder.component';
import { ReminderDetailsComponent } from '../reminder-details/reminder-details.component';
import { ReminderService } from '../../services/reminder.service';
import { ReminderResponse } from '../../model/reminder';
import { NotificationService } from '../../services/notification.service';

type FilterType = 'all' | 'pending' | 'acknowledged' | 'overdue';

@Component({
  selector: 'app-reminder-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule,
    ReminderItemComponent,
    NewReminderComponent,
    ReminderDetailsComponent
  ],
  templateUrl: './reminder-list.component.html',
  styleUrls: ['./reminder-list.component.css']
})
export class ReminderListComponent implements OnInit {
  private reminderService = inject(ReminderService);
  private notificationService = inject(NotificationService);
  
  // Signals para mejor reactividad
  private allReminders = signal<ReminderResponse[]>([]);
  filter = signal<FilterType>('all');
  private searchTerm = signal('');
  
  // Computed signals para los reminders filtrados
  filteredReminders = computed(() => {
    let reminders = this.allReminders();
    
    // Aplicar filtro por estado
    switch (this.filter()) {
      case 'pending':
        reminders = reminders.filter(r => !r.isAcknowledged && !r.isOverdue);
        break;
      case 'acknowledged':
        reminders = reminders.filter(r => r.isAcknowledged);
        break;
      case 'overdue':
        reminders = reminders.filter(r => !r.isAcknowledged && r.isOverdue);
        break;
      default: // 'all'
        break;
    }
    
    // Aplicar búsqueda por texto
    const search = this.searchTerm().toLowerCase();
    if (search) {
      reminders = reminders.filter(r => 
        r.title.toLowerCase().includes(search) || 
        r.description?.toLowerCase().includes(search)
      );
    }
    
    return reminders;
  });
  
  // Estadísticas
  stats = computed(() => {
    const reminders = this.allReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    
    return {
      total: reminders.length,
      acknowledged: reminders.filter(r => r.isAcknowledged).length,
      pending: reminders.filter(r => !r.isAcknowledged && !r.isOverdue).length,
      overdue: reminders.filter(r => !r.isAcknowledged && r.isOverdue).length,
      today: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate.getTime() === today.getTime();
      }).length,
      tomorrow: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate.getTime() === tomorrow.getTime();
      }).length,
      thisWeek: reminders.filter(r => {
        const rDate = new Date(r.reminderDateTime);
        rDate.setHours(0, 0, 0, 0);
        return !r.isAcknowledged && rDate >= today && rDate <= weekEnd;
      }).length
    };
  });

  showNewReminderModal = false;
  showDetailsModal = false;
  selectedReminder: ReminderResponse | null = null;
  loading = false;
  error: string | null = null;
  viewMode: 'grid' | 'list' = 'grid'; // Para cambiar vista

  ngOnInit() {
    this.loadReminders();
  }

  loadReminders() {
    this.loading = true;
    this.error = null;
    
    this.reminderService.getAllRemindersByUser().subscribe({
      next: (reminders) => {
        this.allReminders.set(reminders);
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error loading reminders:', error);
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

  openNewReminderModal() {
    this.showNewReminderModal = true;
  }

  closeNewReminderModal() {
    this.showNewReminderModal = false;
  }

  onReminderCreated(reminderData: any) {
    this.loading = true;
    
    this.reminderService.createReminder(reminderData).subscribe({
      next: (response) => {
        this.loadReminders();
        this.closeNewReminderModal();
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error creating reminder:', error);
      }
    });
  }

  onReminderUpdated() {
    this.loadReminders();
  }

  viewReminderDetails(reminder: ReminderResponse) {
    if (!reminder.reminderId) return;
    
    this.loading = true;
    
    this.reminderService.getReminderById(reminder.reminderId).subscribe({
      next: (reminderDetails) => {
        this.selectedReminder = reminderDetails;
        this.showDetailsModal = true;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
        console.error('Error loading reminder details:', error);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedReminder = null;
  }

  toggleReminderAcknowledgement(reminder: ReminderResponse) {
    // Lógica para cambiar el estado de acknowledged
  }

  deleteReminder(reminderId: number) {
    // Lógica para eliminar reminder
  }

  retry() {
    this.loadReminders();
  }

  // Método para archivar/eliminar reminders completados
  archiveCompletedReminders() {
    const completedReminders = this.allReminders().filter(r => r.isAcknowledged);
    
    if (completedReminders.length === 0) {
      this.notificationService.info('No completed reminders to archive', 'Info');
      return;
    }
    
    if (confirm(`Are you sure you want to archive ${completedReminders.length} completed reminder(s)?`)) {
      const activeReminders = this.allReminders().filter(r => !r.isAcknowledged);
      this.allReminders.set(activeReminders);
      
      this.notificationService.success(`Archived ${completedReminders.length} reminders`, 'Success');
    }
  }

  // Métodos auxiliares para la vista de lista
  getReminderListIcon(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'fas fa-check-circle text-success';
    if (reminder.isOverdue) return 'fas fa-exclamation-circle text-danger';
    if (reminder.isToday) return 'fas fa-bell text-warning';
    if (reminder.isTomorrow) return 'fas fa-clock text-info';
    return 'fas fa-bell text-primary';
  }

  getListBadgeClass(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'bg-success';
    if (reminder.isOverdue) return 'bg-danger';
    if (reminder.isToday) return 'bg-warning';
    if (reminder.isTomorrow) return 'bg-info';
    return 'bg-primary';
  }

  getListBadgeText(reminder: ReminderResponse): string {
    if (reminder.isAcknowledged) return 'Done';
    if (reminder.isOverdue) return 'Overdue';
    if (reminder.isToday) return 'Today';
    if (reminder.isTomorrow) return 'Tomorrow';
    return 'Upcoming';
  }

  // En el componente, agregamos una nueva señal computada para los reminders agrupados
groupedReminders = computed(() => {
  const reminders = this.filteredReminders();
  const groups: { [key: string]: ReminderResponse[] } = {
    'today': [],
    'tomorrow': [],
    'thisWeek': [],
    'later': []
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  
  reminders.forEach(reminder => {
    const rDate = new Date(reminder.reminderDateTime);
    rDate.setHours(0, 0, 0, 0);
    
    if (reminder.isAcknowledged) {
      // Los completados los dejamos aparte
      if (!groups['completed']) groups['completed'] = [];
      groups['completed'].push(reminder);
    } else if (rDate.getTime() === today.getTime()) {
      groups['today'].push(reminder);
    } else if (rDate.getTime() === tomorrow.getTime()) {
      groups['tomorrow'].push(reminder);
    } else if (rDate >= today && rDate <= weekEnd) {
      groups['thisWeek'].push(reminder);
    } else {
      groups['later'].push(reminder);
    }
  });
  
  return groups;
});
}