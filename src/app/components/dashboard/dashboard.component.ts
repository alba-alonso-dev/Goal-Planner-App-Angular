import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, Inject, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';

// Registrar solo lo que usan las gráficas (line, doughnut, bar) para permitir tree-shaking
Chart.register(
  LineController, LineElement, PointElement, Filler,
  DoughnutController, ArcElement,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Legend, Tooltip
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private dashboardService = inject(DashboardService);
  @Inject(PLATFORM_ID) private platformId: Object;

  @ViewChild('taskChart') taskChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('goalChart') goalChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reminderChart') reminderChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Signals del servicio
  stats = this.dashboardService.stats;
  recentActivity = this.dashboardService.recentActivity;
  loading = this.dashboardService.loading;
  error = this.dashboardService.error;

  // UI State
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  chartPeriod = signal<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Charts
  private taskChart: any = null;
  private goalChart: any = null;
  private reminderChart: any = null;

  // Flags para controlar la inicialización
  private chartsInitialized = false;
  private isBrowser: boolean;

  // Data for charts
  taskChartData = computed(() => this.dashboardService.getTaskChartData());
  goalChartData = computed(() => this.dashboardService.getGoalProgressChartData());
  reminderChartData = computed(() => this.dashboardService.getReminderChartData());

  // Recent tasks for the table
  recentTasks = computed(() => {
    return this.dashboardService.getRecentTasks(5);
  });

  constructor() {
    this.platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Efecto para actualizar charts cuando los datos cambien
    if (this.isBrowser) {
      effect(() => {
        // Leer las signals para que el efecto se ejecute cuando cambien
        const taskData = this.taskChartData();
        const goalData = this.goalChartData();
        const reminderData = this.reminderChartData();
        const isLoading = this.loading();
        
        // Solo actualizar si no está cargando y los charts están inicializados
        if (!isLoading && this.chartsInitialized) {
          setTimeout(() => {
            this.refreshCharts();
          }, 100);
        }
      });
    }
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Inicializar charts después de que la vista esté lista
      setTimeout(() => {
        this.initCharts();
      }, 500);
    }
  }

  private loadDashboardData() {
    this.dashboardService.loadDashboardData();
  }

  private initCharts() {
    if (!this.isBrowser) return;
    
    this.destroyCharts();
    this.createTaskChart();
    this.createGoalChart();
    this.createReminderChart();
    this.chartsInitialized = true;
  }

  private destroyCharts() {
    if (this.taskChart) {
      this.taskChart.destroy();
      this.taskChart = null;
    }
    if (this.goalChart) {
      this.goalChart.destroy();
      this.goalChart = null;
    }
    if (this.reminderChart) {
      this.reminderChart.destroy();
      this.reminderChart = null;
    }
  }

  private createTaskChart() {
    if (!this.taskChartCanvas || !this.isBrowser) return;

    const ctx = this.taskChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.taskChartData();
    
    this.taskChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Completed Tasks',
            data: data.datasets[0].data,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#28a745',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'New Tasks',
            data: data.datasets[1].data,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#007bff',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 6
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            }
          }
        },
        hover: {
          mode: 'nearest',
          intersect: true
        }
      }
    });
  }

  private createGoalChart() {
    if (!this.goalChartCanvas || !this.isBrowser) return;

    const ctx = this.goalChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.goalChartData();
    
    this.goalChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.datasets[0].data,
            backgroundColor: ['#28a745', '#ffc107', '#6c757d', '#dc3545'],
            borderWidth: 0,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '70%',
        layout: {
          padding: {
            bottom: 20
          }
        }
      }
    });
  }

  private createReminderChart() {
    if (!this.reminderChartCanvas || !this.isBrowser) return;

    const ctx = this.reminderChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.reminderChartData();
    
    this.reminderChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Upcoming Reminders',
            data: data.datasets[0].data,
            backgroundColor: ['#ffc107', '#17a2b8', '#007bff', '#6c757d'],
            borderRadius: 5,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${value} reminder${value !== 1 ? 's' : ''}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            title: {
              display: true,
              text: 'Number of Reminders'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  refreshCharts() {
    if (!this.isBrowser) return;
    
    
    // Actualizar task chart
    if (this.taskChart) {
      const taskData = this.taskChartData();
      this.taskChart.data.labels = taskData.labels;
      this.taskChart.data.datasets[0].data = taskData.datasets[0].data;
      this.taskChart.data.datasets[1].data = taskData.datasets[1].data;
      this.taskChart.update();
    }
    
    // Actualizar goal chart
    if (this.goalChart) {
      const goalData = this.goalChartData();
      this.goalChart.data.labels = goalData.labels;
      this.goalChart.data.datasets[0].data = goalData.datasets[0].data;
      this.goalChart.update();
    }
    
    // Actualizar reminder chart
    if (this.reminderChart) {
      const reminderData = this.reminderChartData();
      this.reminderChart.data.labels = reminderData.labels;
      this.reminderChart.data.datasets[0].data = reminderData.datasets[0].data;
      this.reminderChart.update();
    }
  }

  setChartPeriod(period: 'daily' | 'weekly' | 'monthly') {
    this.chartPeriod.set(period);
    // Aquí puedes implementar la lógica para filtrar según el período
    setTimeout(() => {
      this.refreshCharts();
    }, 100);
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedDate.set(input.value);
    // Aquí puedes implementar la lógica para filtrar según la fecha
    setTimeout(() => {
      this.refreshCharts();
    }, 100);
  }

  refresh() {
    this.dashboardService.refresh();
    
    // Pequeño retraso para esperar que los datos se carguen
    setTimeout(() => {
      if (this.chartsInitialized) {
        this.refreshCharts();
      } else {
        this.initCharts();
      }
    }, 1000);
  }

  getActivityIcon(activity: any): string {
    return activity.icon;
  }

  getActivityColor(activity: any): string {
    return activity.color;
  }

  getActivityText(activity: any): string {
    switch(activity.action) {
      case 'completed': return 'Completed task';
      case 'acknowledged': return 'Acknowledged reminder';
      case 'overdue': return 'Overdue';
      case 'created': return 'Created';
      default: return activity.action;
    }
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return new Date(date).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  navigateTo(link: string) {
    // La navegación se maneja con RouterModule
  }

  // Clean up charts when component is destroyed
  ngOnDestroy() {
    this.destroyCharts();
  }
}