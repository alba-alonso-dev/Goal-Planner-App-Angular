import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { HomeComponent } from './home.component';
import { LoginPromptService } from '../../../core/auth/login-prompt.service';
import { clickButton, provideDataTesting, signInTestUser } from '../../../../testing/fixtures';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: provideDataTesting() });
    fixture = TestBed.createComponent(HomeComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('opens sign up or login from the main buttons', () => {
    const prompt = TestBed.inject(LoginPromptService);
    clickButton(element, 'Get Started Free');
    expect(prompt.view()).toBe('register');
    clickButton(element, 'Sign In');
    expect(prompt.view()).toBe('login');
  });

  it('goes straight to the dashboard with a session', () => {
    signInTestUser();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    clickButton(element, 'Get Started Free');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(TestBed.inject(LoginPromptService).view()).toBeNull();
  });
});
