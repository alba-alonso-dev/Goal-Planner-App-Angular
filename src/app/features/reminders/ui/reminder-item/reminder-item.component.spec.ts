import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderItemComponent } from './reminder-item.component';
import { toReminderView } from '../../domain/reminder.rules';
import { FIXED_NOW, mockReminder, mockReminderResponse } from '../../../../../testing/fixtures';

describe('ReminderItemComponent', () => {
  let fixture: ComponentFixture<ReminderItemComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ReminderItemComponent] });
    fixture = TestBed.createComponent(ReminderItemComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('reminder', mockReminder);
    await fixture.whenStable();
  });

  const button = (label: string) => element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

  it('shows the title and when it is due', () => {
    expect(element.textContent).toContain(mockReminder.title);
    expect(element.textContent).toContain('Tomorrow');
  });

  it('offers to acknowledge a pending reminder and to undo it once acknowledged', async () => {
    const toggled = vi.fn();
    fixture.componentInstance.toggleAcknowledge.subscribe(toggled);
    button('Mark as acknowledged').click();
    expect(toggled).toHaveBeenCalledWith(mockReminder);

    fixture.componentRef.setInput(
      'reminder',
      toReminderView({ ...mockReminderResponse, isAcknowledged: true }, FIXED_NOW)
    );
    await fixture.whenStable();
    expect(button('Mark as pending')).toBeTruthy();
    expect(element.textContent).toContain('Done');
  });

  it('asks before deleting', () => {
    const deleted = vi.fn();
    fixture.componentInstance.delete.subscribe(deleted);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    button('Delete reminder').click();
    expect(confirm).toHaveBeenCalledWith(`Are you sure you want to delete "${mockReminder.title}"?`);
    expect(deleted).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
