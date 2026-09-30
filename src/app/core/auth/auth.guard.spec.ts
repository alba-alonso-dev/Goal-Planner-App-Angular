import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';

import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.removeItem('user');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])]
    });
  });

  afterEach(() => localStorage.removeItem('user'));

  it('should allow navigation when a user is logged in', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        userId: 1,
        emailId: 'test@example.com',
        fullName: 'Test',
        mobileNo: '600000000'
      })
    );

    expect(executeGuard(route, state)).toBeTrue();
  });

  it('should redirect to /home when no user is logged in', () => {
    const result = executeGuard(route, state);

    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });
});
