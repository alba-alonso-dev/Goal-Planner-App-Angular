import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewReminderComponent } from './new-reminder.component';
import { ReminderInput } from '../../reminder.model';
import { toDateTimeInputValue } from '../../../../shared/utils/date';
import { clickButton, findButton, typeInto } from '../../../../../testing/fixtures';

describe('NewReminderComponent', () => {
  let fixture: ComponentFixture<NewReminderComponent>;
  let element: HTMLElement;
  let created: ReminderInput[];

  const inHours = (hours: number) => toDateTimeInputValue(new Date(Date.now() + hours * 3_600_000));

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NewReminderComponent] });
    fixture = TestBed.createComponent(NewReminderComponent);
    element = fixture.nativeElement;
    created = [];
    fixture.componentInstance.reminderCreated.subscribe(reminder => created.push(reminder));
    await fixture.whenStable();
  });

  it('suggests the next hour and emits the reminder', async () => {
    expect(element.querySelector<HTMLInputElement>('#new-reminder-reminderDateTime')!.value).not.toBe('');

    const when = inHours(3);
    typeInto(element, '#new-reminder-title', 'Call the dentist');
    typeInto(element, '#new-reminder-reminderDateTime', when);
    await fixture.whenStable();
    clickButton(element, 'Create Reminder');

    expect(created).toEqual([{ title: 'Call the dentist', description: '', reminderDateTime: when }]);
  });

  it('rejects a date in the past', async () => {
    typeInto(element, '#new-reminder-title', 'Call the dentist');
    typeInto(element, '#new-reminder-reminderDateTime', inHours(-2));
    await fixture.whenStable();

    expect(findButton(element, 'Create Reminder').disabled).toBe(true);
    expect(element.textContent).toContain('Reminder cannot be in the past');
  });
});
