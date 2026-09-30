import { TestBed } from '@angular/core/testing';
import { ClockService } from './clock.service';

describe('ClockService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks at the start of every minute', () => {
    vi.setSystemTime(new Date(2026, 5, 10, 12, 0, 45));
    const clock = TestBed.inject(ClockService);
    const initial = clock.now();

    vi.advanceTimersByTime(14_999);
    expect(clock.now()).toBe(initial);

    vi.advanceTimersByTime(1);
    expect(clock.now().getSeconds()).toBe(0);
    expect(clock.now().getMinutes()).toBe(1);

    vi.advanceTimersByTime(60_000);
    expect(clock.now().getMinutes()).toBe(2);
  });
});
