import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    return TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.removeItem('user'));
  afterEach(() => localStorage.removeItem('user'));

  it('should be created', () => {
    expect(setup()).toBeTruthy();
  });

  it('should restore a valid stored session', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 7, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));

    expect(setup().loggedUser()?.userId).toBe(7);
  });

  it('should ignore and clear a corrupted stored session', () => {
    localStorage.setItem('user', '{not json');

    expect(setup().loggedUser()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should clear the session on logout', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 7, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));
    const service = setup();

    service.logout();

    expect(service.loggedUser()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
