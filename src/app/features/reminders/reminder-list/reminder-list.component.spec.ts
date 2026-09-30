import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderListComponent } from './reminder-list.component';
import { API_BASE_URL } from '../../../core/config/api.config';
import { NotificationService } from '../../../core/notifications/notification.service';
import { mockReminder, mockReminderResponse, provideFixedClock } from '../../../../testing/fixtures';

describe('ReminderListComponent', () => {
  let component: ReminderListComponent;
  let fixture: ComponentFixture<ReminderListComponent>;
  let httpTesting: HttpTestingController;

  const flushList = (reminders = [mockReminderResponse]) =>
    httpTesting.expectOne(r => r.url === '/api/getReminders').flush(reminders);

  beforeEach(async () => {
    localStorage.setItem('user', JSON.stringify({ userId: 1, emailId: 'a@b.c', fullName: 'A', mobileNo: '1' }));

    await TestBed.configureTestingModule({
      imports: [ReminderListComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideFixedClock(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReminderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('user');
  });

  it('should load and render the reminders', () => {
    flushList();
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain(mockReminder.title);
  });

  it('should acknowledge a reminder optimistically without reloading the list', () => {
    flushList();

    component.toggleReminderAcknowledgement(mockReminder);
    fixture.detectChanges();

    const req = httpTesting.expectOne(`/api/updateReminder/${mockReminder.reminderId}`);
    expect(req.request.body.isAcknowledged).toBeTrue();
    expect(component.stats().acknowledged).toBe(1);
    req.flush({});
    httpTesting.expectNone(r => r.url === '/api/getReminders');
  });

  it('should delete a reminder without reloading the list', () => {
    flushList();

    component.deleteReminder(mockReminder.reminderId);

    expect(component.filteredReminders()).toEqual([]);
    const req = httpTesting.expectOne(`/api/deleteReminder/${mockReminder.reminderId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpTesting.expectNone(r => r.url === '/api/getReminders');
  });

  it('should keep the create modal open and notify when creation fails', () => {
    flushList();
    const notifyError = spyOn(TestBed.inject(NotificationService), 'error');
    component.openNewReminderModal();

    component.onReminderCreated({ title: 'Test', description: '', reminderDateTime: '2030-01-01T10:00' });
    expect(component.creating()).toBeTrue();

    httpTesting.expectOne('/api/createReminder').flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.creating()).toBeFalse();
    expect(component.showNewReminderModal()).toBeTrue();
    expect(component.error()).toBeNull();
    expect(notifyError).toHaveBeenCalled();
  });
});
