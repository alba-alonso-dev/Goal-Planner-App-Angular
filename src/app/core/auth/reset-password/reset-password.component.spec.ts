import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { errorInterceptor } from '../../http/error.interceptor';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../auth.service';
import { LoginPromptService } from '../login-prompt.service';
import { clickButton, signInTestUser, typeInto } from '../../../../testing/fixtures';

const TOKEN = 'a'.repeat(43);

describe('ResetPasswordComponent', () => {
  let httpTesting: HttpTestingController;

  const create = async (token: string | null) => {
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } }
        }
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, navigate };
  };

  const fillPasswords = async (
    { fixture, element }: { fixture: { whenStable(): Promise<unknown> }; element: HTMLElement },
    password: string,
    confirm = password
  ) => {
    typeInto(element, '#reset-password', password);
    typeInto(element, '#reset-confirm', confirm);
    await fixture.whenStable();
  };

  afterEach(() => httpTesting.verify());

  it('removes the token from the URL', async () => {
    const { navigate } = await create(TOKEN);
    expect(navigate).toHaveBeenCalledWith([], { queryParams: {}, replaceUrl: true });
  });

  it('resets the password, clears any local session and offers to log in', async () => {
    const page = await create(TOKEN);
    signInTestUser();
    await fillPasswords(page, 'brand-new-secret');
    clickButton(page.element, 'Save new password');

    const req = httpTesting.expectOne('/api/auth/reset-password');
    expect(req.request.body).toEqual({ token: TOKEN, newPassword: 'brand-new-secret' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await page.fixture.whenStable();

    expect(page.element.textContent).toContain('Your password has been changed');
    expect(TestBed.inject(AuthService).loggedUser()).toBeNull();
    clickButton(page.element, 'Log in with your new password');
    expect(TestBed.inject(LoginPromptService).view()).toBe('login');
  });

  it('does not submit when the passwords are too short or do not match', async () => {
    const page = await create(TOKEN);
    await fillPasswords(page, 'short');
    clickButton(page.element, 'Save new password');
    await fillPasswords(page, 'brand-new-secret', 'brand-new-secreT');
    clickButton(page.element, 'Save new password');
    await page.fixture.whenStable();

    httpTesting.expectNone('/api/auth/reset-password');
    expect(page.element.textContent).toContain('The passwords do not match');
  });

  it('explains an expired link and lets the user ask for a new one', async () => {
    const page = await create(TOKEN);
    await fillPasswords(page, 'brand-new-secret');
    clickButton(page.element, 'Save new password');
    httpTesting
      .expectOne('/api/auth/reset-password')
      .flush({ message: 'This reset link is invalid or has expired' }, { status: 400, statusText: 'Bad Request' });
    await page.fixture.whenStable();

    expect(page.element.querySelector('[role="alert"]')?.textContent).toContain('invalid or has expired');
    clickButton(page.element, 'Request a new link');
    expect(TestBed.inject(LoginPromptService).view()).toBe('forgot');
  });

  it('shows an error without a token', async () => {
    const { element } = await create(null);
    expect(element.textContent).toContain('This link is not valid');
    expect(element.querySelector('form')).toBeNull();
  });
});
