import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  // Features de la aplicación
  features = [
    {
      icon: 'bi bi-bullseye',
      title: 'Goal Tracking',
      description: 'Define and track your personal and professional goals with milestones and progress tracking.',
      color: 'primary',
      link: '/goals'
    },
    {
      icon: 'bi bi-list-task',
      title: 'Task Management',
      description: 'Organize your daily, weekly, and monthly tasks with priority levels and due dates.',
      color: 'success',
      link: '/tasks'
    },
    {
      icon: 'bi bi-bell',
      title: 'Smart Reminders',
      description: 'Never miss important dates with intelligent reminders and notifications.',
      color: 'warning',
      link: '/reminders'
    },
    {
      icon: 'bi bi-graph-up',
      title: 'Analytics Dashboard',
      description: 'Visualize your progress with beautiful charts and detailed statistics.',
      color: 'info',
      link: '/dashboard'
    },
    {
      icon: 'bi bi-calendar-check',
      title: 'Milestone Tracking',
      description: 'Break down your goals into manageable milestones and track completion.',
      color: 'danger',
      link: '/goals'
    },
    {
      icon: 'bi bi-arrow-repeat',
      title: 'Habit Building',
      description: 'Build lasting habits with recurring tasks and consistency tracking.',
      color: 'secondary',
      link: '/tasks'
    }
  ];

  // Estadísticas
  stats = [
    { value: '10K+', label: 'Active Users', icon: 'bi bi-people-fill' },
    { value: '50K+', label: 'Goals Achieved', icon: 'bi bi-trophy-fill' },
    { value: '100K+', label: 'Tasks Completed', icon: 'bi bi-check-circle-fill' },
    { value: '4.9', label: 'User Rating', icon: 'bi bi-star-fill' }
  ];

  // Testimonios
  testimonials = [
    {
      id: 1,
      name: 'Ana García',
      role: 'Product Manager',
      avatar: 'AG',
      content: '"Esta aplicación ha transformado completamente mi productividad. Puedo seguir todos mis objetivos y tareas diarias en un solo lugar."',
      rating: 5
    },
    {
      id: 2,
      name: 'Carlos Rodríguez',
      role: 'Freelancer',
      avatar: 'CR',
      content: '"Los recordatorios inteligentes me ayudan a nunca perder fechas límite. La interfaz es intuitiva y los gráficos son muy útiles."',
      rating: 5
    },
    {
      id: 3,
      name: 'María López',
      role: 'Estudiante',
      avatar: 'ML',
      content: '"Perfecta para organizar mis estudios. Puedo dividir mis metas en hitos y ver mi progreso fácilmente."',
      rating: 5
    }
  ];

  // Pasos para comenzar
  steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up for free in less than 2 minutes.',
      icon: 'bi bi-person-plus-fill'
    },
    {
      number: '02',
      title: 'Set Your Goals',
      description: 'Define your objectives and break them into milestones.',
      icon: 'bi bi-bullseye'
    },
    {
      number: '03',
      title: 'Add Tasks',
      description: 'Create daily, weekly, or monthly tasks.',
      icon: 'bi bi-list-check'
    },
    {
      number: '04',
      title: 'Track Progress',
      description: 'Monitor your achievements and stay motivated.',
      icon: 'bi bi-graph-up-arrow'
    }
  ];

  // FAQ
  faqs = [
    {
      question: 'Is the app really free?',
      answer: 'Yes! Our basic features are completely free. We offer premium plans with advanced features for power users.',
      open: false
    },
    {
      question: 'Can I sync across devices?',
      answer: 'Absolutely! Your data syncs automatically across all your devices when you sign in.',
      open: false
    },
    {
      question: 'How are my reminders handled?',
      answer: 'Reminders are processed in real-time and can be sent via email, push notifications, or both.',
      open: false
    },
    {
      question: 'Can I share goals with others?',
      answer: 'Yes! Premium users can share goals and collaborate with team members or family.',
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