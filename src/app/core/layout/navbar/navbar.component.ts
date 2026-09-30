import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { LoginModalComponent } from '../../auth/login-modal/login-modal.component';
import { AuthService } from '../../auth/auth.service';
import { LoginPromptService } from '../../auth/login-prompt.service';

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

  readonly loginPrompt = inject(LoginPromptService);
  readonly modalVisible = computed(() => this.loginPrompt.view() !== null);
  // Menú colapsable en pantallas pequeñas (no se carga el JS de Bootstrap)
  readonly menuOpen = signal(false);

  constructor() {
    // Cerrar el menú al navegar
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  openModal() {
    this.menuOpen.set(false);
    this.loginPrompt.open('login');
  }

  closeModal() {
    this.loginPrompt.close();
  }

  logout() {
    this.authService.logout().subscribe(() => this.router.navigate(['/home']));
  }
}
