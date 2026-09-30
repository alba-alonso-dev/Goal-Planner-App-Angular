import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../../core/http/error.interceptor';

import { AccountPageComponent } from './account-page.component';
import { NotificationService } from '../../../core/notifications/notification.service';
import { clickButton, signInTestUser, TEST_USER, typeInto } from '../../../../testing/fixtures';

describe('AccountPageComponent', () => {
  let fixture: ComponentFixture<AccountPageComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AccountPageComponent],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    fixture = TestBed.createComponent(AccountPageComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify());

  const fill = async (current: string, password: string, confirm = password) => {
    typeInto(element, '#account-current-password', current);
    typeInto(element, '#account-new-password', password);
    typeInto(element, '#account-confirm-password', confirm);
    await fixture.whenStable();
  };

  it('shows the profile of the logged user', () => {
    expect(element.textContent).toContain(TEST_USER.emailId);
    expect(element.textContent).toContain(TEST_USER.fullName);
  });

  it('changes the password and clears the form', async () => {
    const success = vi.spyOn(TestBed.inject(NotificationService), 'success');
    await fill('supersecret', 'brand-new-secret');
    clickButton(element, 'Change password');

    const req = httpTesting.expectOne('/api/auth/change-password');
    expect(req.request.body).toEqual({ currentPassword: 'supersecret', newPassword: 'brand-new-secret' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(success).toHaveBeenCalled();
    expect(element.querySelector<HTMLInputElement>('#account-new-password')?.value).toBe('');
  });

  it('shows the server error when the current password is wrong', async () => {
    await fill('wrong', 'brand-new-secret');
    clickButton(element, 'Change password');
    httpTesting
      .expectOne('/api/auth/change-password')
      .flush({ message: 'Current password is incorrect' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Current password is incorrect');
  });

  it('does not send mismatched passwords', async () => {
    await fill('supersecret', 'brand-new-secret', 'something-else');
    clickButton(element, 'Change password');
    httpTesting.expectNone('/api/auth/change-password');
  });
});
