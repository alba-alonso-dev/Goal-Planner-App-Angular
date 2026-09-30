import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Comportamiento accesible de un diálogo modal (WAI-ARIA Authoring Practices):
 * - `role="dialog"`, `aria-modal` y `aria-labelledby` (id del título).
 * - Al abrirse lleva el foco al primer campo del formulario (o al primer elemento enfocable).
 * - Tab / Shift+Tab no salen del diálogo.
 * - Escape emite `appDialogDismiss`.
 * - Si el foco se pierde (p. ej. el botón pulsado desaparece al pasar a modo edición), Escape sigue
 *   cerrando y Tab devuelve el foco al diálogo.
 * - Al cerrarse devuelve el foco al elemento que lo abrió.
 */
@Directive({
  selector: '[appDialog]',
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-labelledby]': 'labelledBy()',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown)': 'onDocumentKeydown($event)'
  }
})
export class DialogDirective {
  readonly labelledBy = input.required<string>({ alias: 'appDialogLabelledBy' });
  readonly dismiss = output<void>({ alias: 'appDialogDismiss' });

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly previouslyFocused = this.document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => {
      const target =
        this.host.querySelector<HTMLElement>('[autofocus], input, select, textarea') ??
        this.focusable()[0] ??
        this.host;
      target.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.previouslyFocused && this.document.contains(this.previouslyFocused)) this.previouslyFocused.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.dismiss.emit();
      return;
    }
    if (event.key !== 'Tab') return;

    const elements = this.focusable();
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && (active === first || !this.host.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Teclas pulsadas con el foco fuera del diálogo (lo de dentro ya lo gestiona `onKeydown`). */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.target instanceof Node && this.host.contains(event.target)) return;
    if (event.key === 'Escape') {
      this.dismiss.emit();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      (this.focusable()[0] ?? this.host).focus();
    }
  }

  private focusable(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      el => !el.closest('[hidden], [inert]') && el.getClientRects().length > 0
    );
  }
}
