import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { TEST_USER } from '../../../testing/fixtures';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('starts without a session and never reads it from localStorage', () => {
    localStorage.setItem('user', JSON.stringify(TEST_USER));
    expect(TestBed.inject(AuthService).loggedUser()).toBeNull();
    localStorage.removeItem('user');
  });

  it('restores the session from the server cookie', () => {
    let restored: unknown;
    service.restoreSession().subscribe(user => (restored = user));

    httpTesting.expectOne('/api/auth/me').flush(TEST_USER);

    expect(restored).toEqual(TEST_USER);
    expect(service.loggedUser()).toEqual(TEST_USER);
  });

  it('treats a 401 from /me as "no session" instead of failing app start', () => {
    let restored: unknown = 'pending';
    service.restoreSession().subscribe(user => (restored = user));

    httpTesting.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(restored).toBeNull();
    expect(service.loggedUser()).toBeNull();
  });

  it('opens the session on login and register', () => {
    service.register({ fullName: 'A', emailId: 'a@b.c', password: 'supersecret', mobileNo: '1' }).subscribe();
    httpTesting.expectOne(r => r.method === 'POST' && r.url === '/api/auth/register').flush(TEST_USER);
    expect(service.loggedUser()?.userId).toBe(1);

    service.clearSession();
    service.login({ emailId: 'a@b.c', password: 'supersecret' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush(TEST_USER);
    expect(service.loggedUser()?.userId).toBe(1);
  });

  it('clears the local session on logout even if the request fails', () => {
    service.login({ emailId: 'a@b.c', password: 'x' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush(TEST_USER);

    let completed = false;
    service.logout().subscribe({ complete: () => (completed = true) });
    httpTesting.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    expect(completed).toBe(true);
    expect(service.loggedUser()).toBeNull();
  });
});
