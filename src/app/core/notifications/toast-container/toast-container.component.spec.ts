import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../notification.service';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let element: HTMLElement;
  let notifications: NotificationService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ToastContainerComponent] });
    fixture = TestBed.createComponent(ToastContainerComponent);
    element = fixture.nativeElement;
    notifications = TestBed.inject(NotificationService);
    await fixture.whenStable();
  });

  it('shows each notification with its title and message', async () => {
    notifications.success('Task created', 'Done');
    notifications.error('Something failed');
    await fixture.whenStable();

    const toasts = element.querySelectorAll('[role="alert"]');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].textContent).toContain('Done');
    expect(toasts[0].textContent).toContain('Task created');
    expect(toasts[1].textContent).toContain('Error'); // sin título: el tipo
  });

  it('closes a notification', async () => {
    notifications.info('Heads up');
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('[role="alert"]')).toHaveLength(0);
  });
});
