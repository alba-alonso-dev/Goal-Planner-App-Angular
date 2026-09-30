import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewReminderComponent } from './new-reminder.component';

describe('NewReminderComponent', () => {
  let component: NewReminderComponent;
  let fixture: ComponentFixture<NewReminderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewReminderComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NewReminderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
