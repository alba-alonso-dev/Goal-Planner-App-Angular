import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;">
      @for (toast of notificationService.activeToasts(); track toast.id) {
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
          <div
            class="toast-header"
            [ngClass]="{
              'bg-success text-white': toast.type === 'success',
              'bg-danger text-white': toast.type === 'error',
              'bg-warning text-dark': toast.type === 'warning',
              'bg-info text-white': toast.type === 'info'
            }"
          >
            <i
              class="bi"
              [ngClass]="{
                'bi-check-circle-fill': toast.type === 'success',
                'bi-exclamation-circle-fill': toast.type === 'error',
                'bi-exclamation-triangle-fill': toast.type === 'warning',
                'bi-info-circle-fill': toast.type === 'info'
              }"
            ></i>
            <strong class="me-auto ms-2">{{ toast.title || toast.type | titlecase }}</strong>
            <button
              type="button"
              class="btn-close"
              [class.btn-close-white]="toast.type !== 'warning'"
              (click)="notificationService.remove(toast.id)"
            ></button>
          </div>
          <div class="toast-body">
            {{ toast.message }}
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  notificationService = inject(NotificationService);
}
