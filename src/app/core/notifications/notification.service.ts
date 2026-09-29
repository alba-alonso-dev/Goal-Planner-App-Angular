// services/notification.service.ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  title?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toasts = signal<Toast[]>([]);
  private counter = 0;

  get activeToasts() {
    return this.toasts.asReadonly();
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', title?: string, duration = 3000) {
    const id = ++this.counter;
    const toast: Toast = { id, message, type, title, duration };

    this.toasts.update(current => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  success(message: string, title?: string, duration?: number) {
    return this.show(message, 'success', title, duration);
  }

  error(message: string, title?: string, duration?: number) {
    return this.show(message, 'error', title, duration);
  }

  warning(message: string, title?: string, duration?: number) {
    return this.show(message, 'warning', title, duration);
  }

  info(message: string, title?: string, duration?: number) {
    return this.show(message, 'info', title, duration);
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
