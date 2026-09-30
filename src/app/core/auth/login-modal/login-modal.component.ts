import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../http/api-error';
import { DialogDirective } from '../../../shared/ui/dialog.directive';
import { AuthService } from '../auth.service';
import { AuthView } from '../login-prompt.service';
import { LoginData, RegisterData } from '../user.model';

@Component({
  selector: 'app-login-modal',
  imports: [DialogDirective, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginModalComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly visible = input(false);
  /** Vista con la que se abre; el usuario puede cambiarla después. */
  readonly initialView = input<AuthView>('login');
  readonly closed = output<void>();

  readonly view = linkedSignal(() => this.initialView());

  loginObj: LoginData = { emailId: '', password: '' };
  registerObj: RegisterData = { fullName: '', emailId: '', password: '', mobileNo: '' };
  forgotEmail = '';

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  closeModal() {
    this.closed.emit();
    this.clearMessages();
  }

  showView(view: AuthView) {
    this.view.set(view);
    this.clearMessages();
  }

  onLogin() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginObj).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeModal();
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.serverMessage || $localize`Could not log in. Please try again.`);
      }
    });
  }

  // El backend abre la sesión al registrar: no hace falta un login posterior
  onRegister() {
    this.isLoading.set(true);
    this.clearMessages();

    this.authService.register(this.registerObj).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeModal();
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.serverMessage || $localize`Could not sign up. Please try again.`);
      }
    });
  }

  onForgotPassword() {
    this.isLoading.set(true);
    this.clearMessages();

    this.authService.requestPasswordReset(this.forgotEmail).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(
          $localize`If an account exists for that email, you will receive a link to reset your password in a few minutes.`
        );
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.serverMessage || $localize`Could not send the link. Please try again.`);
      }
    });
  }

  clearMessages() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
