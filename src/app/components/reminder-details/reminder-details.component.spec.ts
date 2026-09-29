import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderDetailsComponent } from './reminder-details.component';
import { mockReminder } from '../../../testing/fixtures';

describe('ReminderDetailsComponent', () => {
  let component: ReminderDetailsComponent;
  let fixture: ComponentFixture<ReminderDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReminderDetailsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReminderDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('reminder', mockReminder);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
