import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  computed,
  effect,
  inject,
  untracked,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClockService } from '../../../core/time/clock.service';
import { GoalStore } from '../../goals/data-access/goal.store';
import { ReminderStore } from '../../reminders/data-access/reminder.store';
import { TaskStore } from '../../tasks/data-access/task.store';
import { ChartData, RecentActivity } from '../dashboard.model';
import {
  dashboardStats,
  goalStatusChart,
  needsAttention,
  taskActivityChart,
  upcomingRemindersChart,
  upcomingTasks
} from '../domain/dashboard.rules';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartType,
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
  LineController,
  LineElement,
  PointElement,
  Filler,
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private taskStore = inject(TaskStore);
  private goalStore = inject(GoalStore);
  private reminderStore = inject(ReminderStore);
  private clock = inject(ClockService);

  // Los canvas solo existen cuando no se está cargando ni hay error
  private taskChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('taskChart');
  private goalChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('goalChart');
  private reminderChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('reminderChart');

  // Todo se deriva de los stores de cada feature: los cambios hechos en otras pantallas se ven sin recargar
  readonly stats = computed(() =>
    dashboardStats(this.taskStore.tasks(), this.goalStore.goals(), this.reminderStore.reminders())
  );
  readonly recentActivity = computed(() =>
    needsAttention(this.taskStore.tasks(), this.goalStore.goals(), this.reminderStore.reminders())
  );
  readonly loading = computed(
    () => this.taskStore.loading() || this.goalStore.loading() || this.reminderStore.loading()
  );
  readonly error = computed(() => this.taskStore.error() ?? this.goalStore.error() ?? this.reminderStore.error());

  // Data for charts
  readonly taskChartData = computed(() => taskActivityChart(this.taskStore.tasks(), this.clock.now()));
  readonly goalChartData = computed(() => goalStatusChart(this.goalStore.goals()));
  readonly reminderChartData = computed(() => upcomingRemindersChart(this.reminderStore.reminders()));

  // Próximas tareas para la tabla
  readonly recentTasks = computed(() => upcomingTasks(this.taskStore.tasks(), 5));

  private destroyRef = inject(DestroyRef);

  constructor() {
    // Cada gráfica se crea cuando aparece su canvas y se actualiza cuando cambian sus datos,
    // sin depender de temporizadores
    this.bindChart(this.taskChartCanvas, () => this.taskChartConfig(this.taskChartData()));
    this.bindChart(this.goalChartCanvas, () => this.goalChartConfig(this.goalChartData()));
    this.bindChart(this.reminderChartCanvas, () => this.reminderChartConfig(this.reminderChartData()));
  }

  ngOnInit() {
    // Solo se piden los datos que aún no estén en memoria
    this.taskStore.load();
    this.goalStore.load();
    this.reminderStore.load();
  }

  refresh() {
    this.taskStore.load({ force: true });
    this.goalStore.load({ force: true });
    this.reminderStore.load({ force: true });
  }

  private bindChart<T extends ChartType>(
    canvas: Signal<ElementRef<HTMLCanvasElement> | undefined>,
    config: () => ChartConfiguration<T>
  ) {
    let chart: Chart<T> | undefined;

    effect(() => {
      const element = canvas()?.nativeElement;
      const chartConfig = config();

      untracked(() => {
        // El canvas se ha recreado (p. ej. tras recargar) o ha desaparecido
        if (chart && chart.canvas !== element) {
          chart.destroy();
          chart = undefined;
        }
        if (!element) return;

        if (chart) {
          chart.data = chartConfig.data;
          chart.update();
        } else {
          chart = new Chart(element, chartConfig);
        }
      });
    });

    this.destroyRef.onDestroy(() => chart?.destroy());
  }

  private taskChartConfig(data: ChartData): ChartConfiguration<'line'> {
    const [due, created] = data.datasets;
    const lineDataset = (dataset: ChartData['datasets'][number]) => ({
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.borderColor,
      backgroundColor: dataset.backgroundColor,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: dataset.borderColor,
      pointBorderColor: '#fff',
      pointRadius: 4,
      pointHoverRadius: 6
    });

    return {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [lineDataset(due), lineDataset(created)]
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
    };
  }

  private goalChartConfig(data: ChartData): ChartConfiguration<'doughnut'> {
    return {
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
              label: context => {
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
    };
  }

  private reminderChartConfig(data: ChartData): ChartConfiguration<'bar'> {
    return {
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
              label: context => {
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
    };
  }

  getActivityText(activity: RecentActivity): string {
    switch (activity.type) {
      case 'task':
        return 'Overdue task';
      case 'goal':
        return 'Overdue goal';
      case 'reminder':
        return 'Missed reminder';
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
}
