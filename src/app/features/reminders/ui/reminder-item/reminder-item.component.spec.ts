import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderItemComponent } from './reminder-item.component';
import { mockReminder } from '../../../../../testing/fixtures';

describe('ReminderItemComponent', () => {
  let component: ReminderItemComponent;
  let fixture: ComponentFixture<ReminderItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReminderItemComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ReminderItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('reminder', mockReminder);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
