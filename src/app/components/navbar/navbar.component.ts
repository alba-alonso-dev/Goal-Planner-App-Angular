import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LoginModalComponent } from "../login-modal/login-modal.component";
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [LoginModalComponent, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  // Exponemos el servicio para leer la señal de usuario en la plantilla
  readonly authService = inject(AuthService);
  private router = inject(Router);

  readonly modalVisible = signal(false);

  openModal() {
    this.modalVisible.set(true);
  }

  closeModal() {
    this.modalVisible.set(false);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
