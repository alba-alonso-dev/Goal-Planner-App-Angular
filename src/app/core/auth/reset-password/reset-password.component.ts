import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PASSWORD_MIN_LENGTH, passwordsMatchValidator } from '../../../shared/forms/password-validators';
import { ApiError } from '../../http/api-error';
import { AuthService } from '../auth.service';
import { LoginPromptService } from '../login-prompt.service';

/** Página del enlace de recuperación: `/reset-password?token=…`. */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private loginPrompt = inject(LoginPromptService);
  private router = inject(Router);

  /** El token se guarda y se quita de la URL (historial, cabecera Referer). */
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  readonly hasToken = !!this.token;

  readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]
      }),
      confirm: new FormControl('', { nonNullable: true, validators: Validators.required })
    },
    { validators: passwordsMatchValidator('password', 'confirm') }
  );
  readonly minLength = PASSWORD_MIN_LENGTH;

  readonly submitting = signal(false);
  readonly done = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.token) this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  submit() {
    if (!this.token || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
        // El servidor ha cerrado todas las sesiones, también la de este navegador si la había
        this.auth.clearSession();
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.error.set(error.serverMessage || error.message);
      }
    });
  }

  openLogin() {
    this.loginPrompt.open('login');
  }

  requestNewLink() {
    this.loginPrompt.open('forgot');
  }
}
