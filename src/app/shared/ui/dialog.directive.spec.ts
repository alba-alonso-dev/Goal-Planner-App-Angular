import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogDirective } from './dialog.directive';

@Component({
  imports: [DialogDirective],
  template: `
    <button id="opener" (click)="open.set(true)">Open</button>
    @if (open()) {
      <div tabindex="-1" appDialog appDialogLabelledBy="title" (appDialogDismiss)="open.set(false)">
        <h2 id="title">Title</h2>
        <button id="close">Close</button>
        <input id="name" />
        <button id="save">Save</button>
      </div>
    }
  `
})
class HostComponent {
  readonly open = signal(false);
}

describe('DialogDirective', () => {
  const key = (target: Element, init: KeyboardEventInit) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));

  async function openDialog() {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('[appDialog]') as HTMLElement;
    return { fixture, opener, dialog };
  }

  it('exposes the dialog semantics', async () => {
    const { dialog } = await openDialog();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('title');
  });

  it('moves focus to the first form field when it opens', async () => {
    const { fixture } = await openDialog();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#name'));
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const { fixture, opener, dialog } = await openDialog();

    key(dialog, { key: 'Escape' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[appDialog]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('still handles the keyboard when the focus is lost (e.g. the focused button disappears)', async () => {
    const { fixture, dialog } = await openDialog();
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);

    key(document.body, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);

    (document.activeElement as HTMLElement).blur();
    key(document.body, { key: 'Escape' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[appDialog]')).toBeNull();
  });

  it('handles Escape inside the dialog only once', async () => {
    const { fixture, dialog } = await openDialog();
    const dismissed = vi.fn();
    fixture.debugElement.children
      .find(child => child.nativeElement === dialog)!
      .injector.get(DialogDirective)
      .dismiss.subscribe(dismissed);

    key(dialog, { key: 'Escape' });
    expect(dismissed).toHaveBeenCalledTimes(1);
  });
});
