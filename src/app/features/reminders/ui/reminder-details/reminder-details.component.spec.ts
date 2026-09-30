import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderDetailsComponent } from './reminder-details.component';
import { ReminderStore } from '../../data-access/reminder.store';
import {
  clickButton,
  mockReminderResponse,
  provideDataTesting,
  signInTestUser,
  typeInto
} from '../../../../../testing/fixtures';

describe('ReminderDetailsComponent', () => {
  let fixture: ComponentFixture<ReminderDetailsComponent>;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;
  let store: ReminderStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ReminderDetailsComponent], providers: provideDataTesting() });
    httpTesting = TestBed.inject(HttpTestingController);
    signInTestUser();
    store = TestBed.inject(ReminderStore);
    store.load();
    httpTesting.expectOne('/api/reminders').flush([mockReminderResponse]);

    fixture = TestBed.createComponent(ReminderDetailsComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('reminder', store.reminders()[0]);
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify());

  const syncFromStore = async () => {
    fixture.componentRef.setInput('reminder', store.reminders()[0]);
    await fixture.whenStable();
  };

  it('shows the reminder and the time left', () => {
    expect(element.textContent).toContain(mockReminderResponse.title);
    expect(element.textContent).toContain('22 hours');
    expect(element.textContent).toContain('Tomorrow');
  });

  it('acknowledges the reminder optimistically', async () => {
    clickButton(element, 'Mark Acknowledged');
    await syncFromStore();
    expect(element.textContent).toContain('Mark Unacknowledged');

    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/reminders/1' });
    expect(req.request.body.isAcknowledged).toBe(true);
    req.flush({ ...mockReminderResponse, isAcknowledged: true });
  });

  it('edits the title', async () => {
    clickButton(element, 'Edit');
    await fixture.whenStable();
    typeInto(element, '#reminder-details-title', 'Review the quarterly goals');
    await fixture.whenStable();
    clickButton(element, 'Save Changes');

    const req = httpTesting.expectOne({ method: 'PUT', url: '/api/reminders/1' });
    expect(req.request.body.title).toBe('Review the quarterly goals');
    req.flush({ ...mockReminderResponse, title: 'Review the quarterly goals' });
    await syncFromStore();
    expect(element.textContent).toContain('Review the quarterly goals');
  });
});
