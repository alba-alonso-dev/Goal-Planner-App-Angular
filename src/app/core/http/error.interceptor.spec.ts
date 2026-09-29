import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { errorInterceptor } from './error.interceptor';
import { ApiError } from './api-error';
import { AuthService } from '../../services/auth.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => localStorage.removeItem('user'));
  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('should map HTTP errors to ApiError with a user-facing message and server message', () => {
    setup();
    let captured: unknown;
    http.get('/api/test').subscribe({ error: e => (captured = e) });

    httpTesting.expectOne('/api/test').flush({ message: 'Email already registered' }, { status: 400, statusText: 'Bad Request' });

    const error = captured as ApiError;
    expect(error instanceof ApiError).toBeTrue();
    expect(error.status).toBe(400);
    expect(error.message).toContain('Error de validación');
    expect(error.serverMessage).toBe('Email already registered');
  });

  it('should parse JSON error bodies sent as text', () => {
    setup();
    let captured: unknown;
    http.get('/api/test').subscribe({ error: e => (captured = e) });

    httpTesting.expectOne('/api/test').flush('{"title":"Not found"}', { status: 404, statusText: 'Not Found' });

    expect((captured as ApiError).serverMessage).toBe('Not found');
  });

  it('should log out and redirect to /home on 401 when a user is logged in', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 1, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));
    setup();
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    let captured: unknown;
    http.get('/api/test').subscribe({ error: e => (captured = e) });
    httpTesting.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect((captured as ApiError).status).toBe(401);
    expect(TestBed.inject(AuthService).loggedUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should not redirect on 401 when nobody is logged in (e.g. wrong credentials)', () => {
    setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    http.get('/api/test').subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
  });
});
