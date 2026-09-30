import { BadRequestException } from '@nestjs/common';
import { assertDateOrder, isDateOnly } from './validation.js';

describe('validation helpers', () => {
  it('accepts only real calendar days in YYYY-MM-DD format', () => {
    expect(isDateOnly('2026-06-10')).toBe(true);
    expect(isDateOnly('2028-02-29')).toBe(true);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('2026-6-10')).toBe(false);
    expect(isDateOnly('2026-06-10T00:00:00Z')).toBe(false);
    expect(isDateOnly(20260610)).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    expect(() => assertDateOrder('2026-06-10', '2026-06-10', 'x')).not.toThrow();
    expect(() => assertDateOrder('2026-06-10', '2026-06-09', 'x')).toThrow(BadRequestException);
  });
});
