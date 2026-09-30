import { ReminderResponse } from '../reminder.model';
import {
  matchesReminderFilter,
  matchesReminderSearch,
  reminderBucket,
  reminderStats,
  selectReminders,
  timeRemaining,
  toReminderView
} from './reminder.rules';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

const reminder = (when: Date, overrides: Partial<ReminderResponse> = {}): ReminderResponse => ({
  reminderId: 1,
  title: 'Llamar al médico',
  description: 'Pedir cita',
  reminderDateTime: when.toISOString(),
  isAcknowledged: false,
  userId: 1,
  ...overrides
});

describe('reminder rules', () => {
  // Miércoles 10 de junio de 2026, 15:00
  const now = at(2026, 6, 10, 15, 0);

  describe('reminderBucket', () => {
    const cases: [string, Date, string | null][] = [
      ['earlier today → overdue', at(2026, 6, 10, 9), 'overdue'],
      ['yesterday → overdue', at(2026, 6, 9, 20), 'overdue'],
      ['later today → today', at(2026, 6, 10, 23, 59), 'today'],
      ['tomorrow morning → tomorrow', at(2026, 6, 11, 0, 5), 'tomorrow'],
      ['in 2 days → thisWeek', at(2026, 6, 12, 8), 'thisWeek'],
      ['in 7 days → thisWeek', at(2026, 6, 17, 23), 'thisWeek'],
      ['in 8 days → later', at(2026, 6, 18, 0, 1), 'later']
    ];
    for (const [label, when, expected] of cases) {
      it(label, () => expect(reminderBucket(reminder(when), now)).toBe(expected as never));
    }

    it('acknowledged reminders have no bucket', () => {
      expect(reminderBucket(reminder(at(2026, 6, 9), { isAcknowledged: true }), now)).toBeNull();
    });
  });

  describe('timeRemaining', () => {
    it('formats minutes, hours and days with correct plurals', () => {
      expect(timeRemaining(reminder(at(2026, 6, 10, 15, 1)), now)).toBe('1 minute');
      expect(timeRemaining(reminder(at(2026, 6, 10, 15, 45)), now)).toBe('45 minutes');
      expect(timeRemaining(reminder(at(2026, 6, 10, 16, 0)), now)).toBe('1 hour');
      expect(timeRemaining(reminder(at(2026, 6, 11, 14, 0)), now)).toBe('23 hours');
      expect(timeRemaining(reminder(at(2026, 6, 13, 15, 0)), now)).toBe('3 days');
      expect(timeRemaining(reminder(at(2026, 6, 10, 14, 0)), now)).toBe('Overdue');
    });
  });

  describe('toReminderView', () => {
    it('marks a past pending reminder as overdue but still "today"', () => {
      const view = toReminderView(reminder(at(2026, 6, 10, 9)), now);
      expect(view).toEqual(expect.objectContaining({ bucket: 'overdue', isOverdue: true, isToday: true }));
    });

    it('an acknowledged past reminder is not overdue', () => {
      const view = toReminderView(reminder(at(2026, 6, 1), { isAcknowledged: true }), now);
      expect(view.isOverdue).toBe(false);
      expect(view.bucket).toBeNull();
    });
  });

  describe('reminderStats', () => {
    it('counts every reminder in exactly one status and one time bucket', () => {
      const views = [
        reminder(at(2026, 6, 10, 9)), // overdue
        reminder(at(2026, 6, 10, 20)), // today
        reminder(at(2026, 6, 11, 9)), // tomorrow
        reminder(at(2026, 6, 14, 9)), // this week
        reminder(at(2026, 7, 1, 9)), // later
        reminder(at(2026, 6, 10, 20), { isAcknowledged: true })
      ].map(r => toReminderView(r, now));

      expect(reminderStats(views)).toEqual({
        total: 6,
        acknowledged: 1,
        pending: 4,
        overdue: 1,
        today: 1,
        tomorrow: 1,
        thisWeek: 1,
        later: 1
      });
    });
  });

  describe('filters and search', () => {
    const upcoming = toReminderView(reminder(at(2026, 6, 11)), now);
    const done = toReminderView(reminder(at(2026, 6, 11), { isAcknowledged: true }), now);
    const late = toReminderView(reminder(at(2026, 6, 9)), now);

    it('applies each status filter', () => {
      const all = [upcoming, done, late];
      expect(all.filter(r => matchesReminderFilter(r, 'pending'))).toEqual([upcoming]);
      expect(all.filter(r => matchesReminderFilter(r, 'acknowledged'))).toEqual([done]);
      expect(all.filter(r => matchesReminderFilter(r, 'overdue'))).toEqual([late]);
      expect(selectReminders(all, { filter: 'all', search: '' }).length).toBe(3);
    });

    it('searches title and description', () => {
      expect(matchesReminderSearch(upcoming, 'MÉDICO')).toBe(true);
      expect(matchesReminderSearch(upcoming, 'cita')).toBe(true);
      expect(matchesReminderSearch(upcoming, 'dentista')).toBe(false);
    });
  });
});
