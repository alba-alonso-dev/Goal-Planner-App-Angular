import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { dateOrderValidator, milestonesWithinRangeValidator, notInPastValidator } from './date-validators';

describe('date validators', () => {
  describe('dateOrderValidator', () => {
    const form = (start: string, end: string) =>
      new FormGroup(
        { startDate: new FormControl(start), dueDate: new FormControl(end) },
        { validators: dateOrderValidator('startDate', 'dueDate', 'dueDateBeforeStart') }
      );

    it('flags an end date before the start date', () => {
      expect(form('2026-06-10', '2026-06-09').hasError('dueDateBeforeStart')).toBe(true);
    });

    it('accepts the same day and later days', () => {
      expect(form('2026-06-10', '2026-06-10').valid).toBe(true);
      expect(form('2026-06-10', '2026-07-01').valid).toBe(true);
    });

    it('ignores empty or invalid dates (left to the required validator)', () => {
      expect(form('', '2026-06-01').valid).toBe(true);
      expect(form('2026-06-10', 'nope').valid).toBe(true);
    });

    it('re-evaluates when either field changes', () => {
      const f = form('2026-06-10', '2026-06-09');
      f.controls.startDate.setValue('2026-06-01');
      expect(f.valid).toBe(true);
      f.controls.dueDate.setValue('2026-05-31');
      expect(f.hasError('dueDateBeforeStart')).toBe(true);
    });
  });

  describe('milestonesWithinRangeValidator', () => {
    const form = (...targets: string[]) =>
      new FormGroup(
        {
          startDate: new FormControl('2026-06-01'),
          endDate: new FormControl('2026-06-30'),
          milestones: new FormArray(targets.map(t => new FormGroup({ targetDate: new FormControl(t) })))
        },
        { validators: milestonesWithinRangeValidator('startDate', 'endDate', 'milestones') }
      );

    it('reports the indexes of milestones outside the goal dates', () => {
      expect(form('2026-06-01', '2026-05-31', '2026-06-30', '2026-07-01').getError('milestoneOutOfRange')).toEqual([
        1, 3
      ]);
    });

    it('is valid when every milestone is within range or there are none', () => {
      expect(form('2026-06-15').valid).toBe(true);
      expect(form().valid).toBe(true);
    });
  });

  describe('notInPastValidator', () => {
    const now = () => new Date(2026, 5, 10, 12, 0);

    it('flags a date and time before now', () => {
      const control = new FormControl('2026-06-10T11:59', notInPastValidator({ now }));
      expect(control.hasError('pastDate')).toBe(true);
      control.setValue('2026-06-10T12:01');
      expect(control.valid).toBe(true);
    });

    it('with onlyWhenChanged, accepts an untouched past value (editing an overdue reminder)', () => {
      const control = new FormControl('2026-06-01T09:00', notInPastValidator({ onlyWhenChanged: true, now }));
      expect(control.valid).toBe(true);

      control.markAsDirty();
      control.updateValueAndValidity();
      expect(control.hasError('pastDate')).toBe(true);
    });
  });
});
