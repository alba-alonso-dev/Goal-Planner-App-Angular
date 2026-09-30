import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthView, LoginPromptService } from '../../../core/auth/login-prompt.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private auth = inject(AuthService);
  private loginPrompt = inject(LoginPromptService);
  private router = inject(Router);

  /** Botones principales: abren el modal de acceso, o el dashboard si ya hay sesión. */
  start(view: AuthView) {
    if (this.auth.loggedUser()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.loginPrompt.open(view);
    }
  }

  // Features de la aplicación
  features = [
    {
      icon: 'bi bi-bullseye',
      title: $localize`Goal Tracking`,
      description: $localize`Define and track your personal and professional goals with milestones and progress tracking.`,
      color: 'primary',
      link: '/goals'
    },
    {
      icon: 'bi bi-list-task',
      title: $localize`Task Management`,
      description: $localize`Organize your daily, weekly, and monthly tasks with priority levels and due dates.`,
      color: 'success',
      link: '/tasks'
    },
    {
      icon: 'bi bi-bell',
      title: $localize`Smart Reminders`,
      description: $localize`Never miss important dates with intelligent reminders and notifications.`,
      color: 'warning',
      link: '/reminders'
    },
    {
      icon: 'bi bi-graph-up',
      title: $localize`Analytics Dashboard`,
      description: $localize`Visualize your progress with beautiful charts and detailed statistics.`,
      color: 'info',
      link: '/dashboard'
    },
    {
      icon: 'bi bi-calendar-check',
      title: $localize`Milestone Tracking`,
      description: $localize`Break down your goals into manageable milestones and track completion.`,
      color: 'danger',
      link: '/goals'
    },
    {
      icon: 'bi bi-arrow-repeat',
      title: $localize`Habit Building`,
      description: $localize`Build lasting habits with recurring tasks and consistency tracking.`,
      color: 'secondary',
      link: '/tasks'
    }
  ];

  // Estadísticas
  stats = [
    { value: '10K+', label: $localize`Active Users`, icon: 'bi bi-people-fill' },
    { value: '50K+', label: $localize`Goals Achieved`, icon: 'bi bi-trophy-fill' },
    { value: '100K+', label: $localize`Tasks Completed`, icon: 'bi bi-check-circle-fill' },
    { value: '4.9', label: $localize`User Rating`, icon: 'bi bi-star-fill' }
  ];

  // Testimonios
  testimonials = [
    {
      id: 1,
      name: 'Ana García',
      role: $localize`Product Manager`,
      avatar: 'AG',
      content: $localize`"This app has completely transformed my productivity. I can follow all my goals and daily tasks in one place."`,
      rating: 5
    },
    {
      id: 2,
      name: 'Carlos Rodríguez',
      role: $localize`Freelancer`,
      avatar: 'CR',
      content: $localize`"The smart reminders help me never miss a deadline. The interface is intuitive and the charts are really useful."`,
      rating: 5
    },
    {
      id: 3,
      name: 'María López',
      role: $localize`Student`,
      avatar: 'ML',
      content: $localize`"Perfect for organising my studies. I can split my goals into milestones and see my progress easily."`,
      rating: 5
    }
  ];

  // Pasos para comenzar
  steps = [
    {
      number: '01',
      title: $localize`Create Account`,
      description: $localize`Sign up for free in less than 2 minutes.`,
      icon: 'bi bi-person-plus-fill'
    },
    {
      number: '02',
      title: $localize`Set Your Goals`,
      description: $localize`Define your objectives and break them into milestones.`,
      icon: 'bi bi-bullseye'
    },
    {
      number: '03',
      title: $localize`Add Tasks`,
      description: $localize`Create daily, weekly, or monthly tasks.`,
      icon: 'bi bi-list-check'
    },
    {
      number: '04',
      title: $localize`Track Progress`,
      description: $localize`Monitor your achievements and stay motivated.`,
      icon: 'bi bi-graph-up-arrow'
    }
  ];

  // FAQ
  faqs = [
    {
      question: $localize`Is the app really free?`,
      answer: $localize`Yes! Our basic features are completely free. We offer premium plans with advanced features for power users.`,
      open: false
    },
    {
      question: $localize`Can I sync across devices?`,
      answer: $localize`Absolutely! Your data syncs automatically across all your devices when you sign in.`,
      open: false
    },
    {
      question: $localize`How are my reminders handled?`,
      answer: $localize`You get an alert in the app, and a desktop notification if you allow it, as soon as a reminder is due.`,
      open: false
    },
    {
      question: $localize`Can I share goals with others?`,
      answer: $localize`Yes! Premium users can share goals and collaborate with team members or family.`,
      open: false
    }
  ];

  toggleFaq(index: number) {
    this.faqs[index].open = !this.faqs[index].open;
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
