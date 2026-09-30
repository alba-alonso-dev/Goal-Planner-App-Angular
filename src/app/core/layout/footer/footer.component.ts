import { ChangeDetectionStrategy, Component, LOCALE_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Idiomas publicados por el build de producción (ver `i18n.locales` en angular.json). */
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' }
] as const;

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  /** Cada idioma se sirve bajo su propio subdirectorio (`/en/`, `/es/`). */
  readonly otherLanguages = LANGUAGES.filter(l => !inject(LOCALE_ID).startsWith(l.code));
}
