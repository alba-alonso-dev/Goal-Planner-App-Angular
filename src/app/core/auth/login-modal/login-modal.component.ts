import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { LoginData, RegisterData } from '../user.model';
import { Router } from '@angular/router';
import { ApiError } from '../../http/api-error';

import { DialogDirective } from '../../../shared/ui/dialog.directive';

@Component({
  selector: 'app-login-modal',
  imports: [DialogDirective, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginModalComponent {
  readonly visible = input(false);
  readonly closed = output<void>();

  // Signal para alternar entre login (true) y registro (false)
  showLogin = signal<boolean>(true);

  // Usamos la interfaz LoginData
  loginObj: LoginData = {
    emailId: '',
    password: ''
  };

  // Usamos la interfaz RegisterData
  registerObj: RegisterData = {
    fullName: '',
    emailId: '',
    password: '',
    mobileNo: ''
  };

  // Para mostrar mensajes de error/éxito
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  private authService = inject(AuthService);
  private router = inject(Router);

  // Cierra el modal (emite el evento al padre)
  closeModal() {
    this.closed.emit();
    // Limpiar mensajes al cerrar
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  // Alternar entre login y registro
  toggleForm() {
    this.showLogin.update(value => !value);
    // Limpiar mensajes al cambiar de formulario
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  // Método llamado al enviar login
  onLogin() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginObj).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeModal(); // Cierra el modal
        this.router.navigate(['/dashboard']); // Navega al dashboard
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.serverMessage || $localize`Could not log in. Please try again.`);
        console.error('Login error', err);
      }
    });
  }

  // Método llamado al enviar registro
  onRegister() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // El backend abre la sesión al registrar: no hace falta un login posterior
    this.authService.register(this.registerObj).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeModal();
        this.router.navigate(['/dashboard']);
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.serverMessage || $localize`Could not sign up. Please try again.`);
        console.error('Register error', err);
      }
    });
  }

  // Método para limpiar mensajes
  clearMessages() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
