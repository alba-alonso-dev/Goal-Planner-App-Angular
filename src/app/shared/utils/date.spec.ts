import { addDays, daysBetween, startOfDay, toApiDate, toDateInputValue, toDateTimeInputValue } from './date';

describe('date utils', () => {
  describe('toApiDate', () => {
    it('should serialize a local date as ISO 8601 UTC', () => {
      const date = new Date(2026, 2, 15, 10, 30);
      expect(toApiDate(date)).toBe(date.toISOString());
    });

    it('should treat date-only input values as local midnight', () => {
      expect(toApiDate('2026-03-15')).toBe(new Date(2026, 2, 15).toISOString());
    });

    it('should round-trip a date input value through the API format', () => {
      expect(toDateInputValue(toApiDate('2026-03-15'))).toBe('2026-03-15');
    });

    it('should throw on invalid dates instead of silently using today', () => {
      expect(() => toApiDate('not a date')).toThrowError(/Invalid date/);
    });
  });

  describe('toDateInputValue', () => {
    it('should use local calendar day (not UTC)', () => {
      // 00:30 local: en husos UTC+X, toISOString() devolvería el día anterior
      expect(toDateInputValue(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
    });

    it('should pad month and day', () => {
      expect(toDateInputValue(new Date(2026, 8, 3))).toBe('2026-09-03');
    });
  });

  describe('toDateTimeInputValue', () => {
    it('should format local date and time for datetime-local inputs', () => {
      expect(toDateTimeInputValue(new Date(2026, 11, 31, 9, 5))).toBe('2026-12-31T09:05');
    });

    it('should round-trip with the value the input produces', () => {
      const value = '2026-06-10T18:45';
      expect(toDateTimeInputValue(value)).toBe(value);
    });
  });

  describe('startOfDay / addDays / daysBetween', () => {
    it('should reset time to local midnight without mutating the input', () => {
      const input = new Date(2026, 4, 20, 15, 45);
      const result = startOfDay(input);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(input.getHours()).toBe(15);
    });

    it('should add and subtract days', () => {
      expect(toDateInputValue(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
      expect(toDateInputValue(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
    });

    it('should count calendar days regardless of time of day', () => {
      expect(daysBetween(new Date(2026, 0, 1, 23, 0), new Date(2026, 0, 2, 1, 0))).toBe(1);
      expect(daysBetween(new Date(2026, 0, 10), new Date(2026, 0, 3))).toBe(-7);
      expect(daysBetween(new Date(2026, 0, 1, 8), new Date(2026, 0, 1, 20))).toBe(0);
    });
  });
});
