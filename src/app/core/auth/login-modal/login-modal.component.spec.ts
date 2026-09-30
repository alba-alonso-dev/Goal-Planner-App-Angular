import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { errorInterceptor } from '../../http/error.interceptor';

import { LoginModalComponent } from './login-modal.component';
import { AuthService } from '../auth.service';
import { clickButton, TEST_USER, typeInto } from '../../../../testing/fixtures';

describe('LoginModalComponent', () => {
  let fixture: ComponentFixture<LoginModalComponent>;
  let httpTesting: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LoginModalComponent],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginModalComponent);
    fixture.componentRef.setInput('visible', true);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify());

  const title = () => element.querySelector('#authModalTitle')?.textContent?.trim();

  it('renders nothing while hidden', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('logs in, closes and goes to the dashboard', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    typeInto(element, 'input[name="emailId"]', TEST_USER.emailId);
    typeInto(element, 'input[name="password"]', 'supersecret');
    await fixture.whenStable();
    clickButton(element, 'Login');

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ emailId: TEST_USER.emailId, password: 'supersecret' });
    req.flush(TEST_USER);

    expect(TestBed.inject(AuthService).loggedUser()).toEqual(TEST_USER);
    expect(closed).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows the server message when the login fails', async () => {
    typeInto(element, 'input[name="emailId"]', TEST_USER.emailId);
    typeInto(element, 'input[name="password"]', 'wrong');
    await fixture.whenStable();
    clickButton(element, 'Login');
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Invalid email or password');
  });

  it('switches between login, sign up and password recovery', async () => {
    expect(title()).toBe('Welcome Back!');
    clickButton(element, 'Sign Up');
    await fixture.whenStable();
    expect(title()).toBe('Create your account');
    clickButton(element, 'Login');
    await fixture.whenStable();
    clickButton(element, 'Forgot your password?');
    await fixture.whenStable();
    expect(title()).toBe('Reset your password');
  });

  it('opens directly in the requested view', async () => {
    fixture.componentRef.setInput('initialView', 'register');
    await fixture.whenStable();
    expect(title()).toBe('Create your account');
  });

  it('requests a reset link and gives the same answer whether the account exists or not', async () => {
    fixture.componentRef.setInput('initialView', 'forgot');
    await fixture.whenStable();
    typeInto(element, 'input[name="forgotEmail"]', 'someone@example.com');
    await fixture.whenStable();
    clickButton(element, 'Send link');

    const req = httpTesting.expectOne('/api/auth/forgot-password');
    expect(req.request.body).toEqual({ emailId: 'someone@example.com', locale: 'en' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('If an account exists for that email');
  });
});
