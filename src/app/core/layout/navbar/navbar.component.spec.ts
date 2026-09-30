import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../auth/auth.service';
import { LoginPromptService } from '../../auth/login-prompt.service';
import { clickButton, provideDataTesting, signInTestUser, TEST_USER } from '../../../../testing/fixtures';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NavbarComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NavbarComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify());

  const links = () => [...element.querySelectorAll('nav a.nav-link')].map(a => a.textContent?.trim());

  it('offers only Home and Login without a session, and opens the login dialog', async () => {
    expect(links()).toEqual(['Home']);
    clickButton(element, 'Login');
    // El modal se descarga con @defer al abrirlo
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    });

    expect(TestBed.inject(LoginPromptService).view()).toBe('login');
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('shows the private sections and the account link with a session', async () => {
    signInTestUser();
    await fixture.whenStable();

    expect(links()).toEqual(['Dashboard', 'Tasks', 'Goals', 'Reminders']);
    const account = element.querySelector<HTMLAnchorElement>('a[href="/account"]');
    expect(account?.textContent).toContain(TEST_USER.emailId);
  });

  it('logs out and goes home', async () => {
    signInTestUser();
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    clickButton(element, 'Logout');
    await new Promise(resolve => setTimeout(resolve)); // primero se da de baja el push (asíncrono)
    httpTesting.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush(null);

    expect(TestBed.inject(AuthService).loggedUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });
});
