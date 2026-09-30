import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../notification.service';

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
              'text-bg-success': toast.type === 'success',
              'text-bg-danger': toast.type === 'error',
              'text-bg-warning': toast.type === 'warning',
              'text-bg-info': toast.type === 'info'
            }"
          >
            <i
              aria-hidden="true"
              class="bi"
              [ngClass]="{
                'bi-check-circle-fill': toast.type === 'success',
                'bi-exclamation-circle-fill': toast.type === 'error',
                'bi-exclamation-triangle-fill': toast.type === 'warning',
                'bi-info-circle-fill': toast.type === 'info'
              }"
            ></i>
            <strong class="me-auto ms-2">{{ toast.title || typeLabels[toast.type] }}</strong>
            <button
              i18n-aria-label
              aria-label="Close"
              type="button"
              class="btn-close"
              [class.btn-close-white]="toast.type === 'success' || toast.type === 'error'"
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

  /** Título cuando la notificación no trae uno. */
  protected readonly typeLabels = {
    success: $localize`Success`,
    error: $localize`Error`,
    warning: $localize`Warning`,
    info: $localize`Information`
  };
}
