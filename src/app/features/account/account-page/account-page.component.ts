import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notifications/notification.service';
import { PASSWORD_MIN_LENGTH, passwordsMatchValidator } from '../../../shared/forms/password-validators';

/** Página de la cuenta: datos del perfil y cambio de contraseña. */
@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountPageComponent {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  readonly user = this.auth.loggedUser;
  readonly minLength = PASSWORD_MIN_LENGTH;

  readonly passwordForm = new FormGroup(
    {
      current: new FormControl('', { nonNullable: true, validators: Validators.required }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]
      }),
      confirm: new FormControl('', { nonNullable: true, validators: Validators.required })
    },
    { validators: passwordsMatchValidator('password', 'confirm') }
  );

  readonly saving = signal(false);
  readonly passwordError = signal<string | null>(null);

  changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { current, password } = this.passwordForm.getRawValue();
    this.saving.set(true);
    this.passwordError.set(null);
    this.auth.changePassword(current, password).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordForm.reset();
        this.notifications.success(
          $localize`Your password has been changed. Your other sessions have been closed.`,
          $localize`Success`
        );
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.passwordError.set(error.serverMessage || error.message);
      }
    });
  }
}
