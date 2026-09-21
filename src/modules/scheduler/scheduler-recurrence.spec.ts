import {
  addCalendarMonths,
  lastDayOfMonth,
  nextOccurrence,
  parseUntilUtc,
  skipMissedOccurrences,
  zonedParts,
  zonedToUtc,
  type RecurrenceRule,
} from './scheduler-recurrence';

describe('scheduler-recurrence', () => {
  const ny = 'America/New_York';
  const kolkata = 'Asia/Kolkata';

  it('zonedToUtc round-trips a Kolkata wall time', () => {
    const utc = zonedToUtc(kolkata, 2026, 6, 15, 10, 30, 0);
    const parts = zonedParts(utc, kolkata);
    expect(parts).toMatchObject({ year: 2026, month: 6, day: 15, hour: 10, minute: 30, second: 0 });
  });

  it('daily next preserves local clock across US spring-forward', () => {
    const from = zonedToUtc(ny, 2026, 3, 7, 15, 0, 0);
    const next = nextOccurrence(from, ny, { kind: 'daily', interval: 1 }, from);
    const parts = zonedParts(next, ny);
    expect(parts).toMatchObject({ year: 2026, month: 3, day: 8, hour: 15, minute: 0 });
  });

  it('spring-forward nonexistent local time snaps forward', () => {
    // 2026-03-08 02:00 EST → 03:00 EDT; 02:30 does not exist. Snap to 03:30 EDT = 07:30 UTC.
    const utc = zonedToUtc(ny, 2026, 3, 8, 2, 30, 0);
    expect(utc.toISOString()).toBe('2026-03-08T07:30:00.000Z');
    expect(zonedParts(utc, ny)).toMatchObject({ year: 2026, month: 3, day: 8, hour: 3, minute: 30 });
  });

  it('daily next that lands in a spring-forward gap snaps forward', () => {
    const from = zonedToUtc(ny, 2026, 3, 7, 2, 30, 0);
    const next = nextOccurrence(from, ny, { kind: 'daily', interval: 1 }, from);
    expect(zonedParts(next, ny)).toMatchObject({ year: 2026, month: 3, day: 8, hour: 3, minute: 30 });
    expect(next.toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });

  it('daily next preserves local clock across US fall-back', () => {
    const from = zonedToUtc(ny, 2026, 10, 31, 15, 0, 0);
    const next = nextOccurrence(from, ny, { kind: 'daily', interval: 1 }, from);
    const parts = zonedParts(next, ny);
    expect(parts).toMatchObject({ year: 2026, month: 11, day: 1, hour: 15, minute: 0 });
  });

  it('fall-back ambiguous local time picks the earlier offset', () => {
    // 2026-11-01 01:30 happens twice. Earlier offset is EDT (−04) = 05:30 UTC.
    const utc = zonedToUtc(ny, 2026, 11, 1, 1, 30, 0);
    expect(utc.toISOString()).toBe('2026-11-01T05:30:00.000Z');
    expect(zonedParts(utc, ny)).toMatchObject({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 });
  });

  it('daily next that lands in a fall-back overlap picks the earlier offset', () => {
    const from = zonedToUtc(ny, 2026, 10, 31, 1, 30, 0);
    const next = nextOccurrence(from, ny, { kind: 'daily', interval: 1 }, from);
    expect(next.toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('monthly day 31 clamps to last day of shorter months', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28);
    const jan = addCalendarMonths(2026, 1, 31, 1);
    expect(jan).toEqual({ year: 2026, month: 2, day: 28 });
    const from = zonedToUtc(ny, 2026, 1, 31, 9, 0, 0);
    const next = nextOccurrence(from, ny, { kind: 'monthly', interval: 1, dayOfMonth: 31 }, from);
    const parts = zonedParts(next, ny);
    expect(parts).toMatchObject({ year: 2026, month: 2, day: 28, hour: 9, minute: 0 });
  });

  it('monthly leap-year February keeps the 29th', () => {
    const from = zonedToUtc(ny, 2024, 1, 31, 9, 0, 0);
    const next = nextOccurrence(from, ny, { kind: 'monthly', interval: 1, dayOfMonth: 31 }, from);
    const parts = zonedParts(next, ny);
    expect(parts).toMatchObject({ year: 2024, month: 2, day: 29, hour: 9 });
  });

  it('weekly interval 2 skips the in-between week', () => {
    const anchor = zonedToUtc(ny, 2026, 6, 7, 10, 0, 0);
    const rule: RecurrenceRule = { kind: 'weekly', interval: 2, daysOfWeek: [1, 3] };
    const mon = nextOccurrence(anchor, ny, rule, anchor);
    expect(zonedParts(mon, ny)).toMatchObject({ year: 2026, month: 6, day: 8, weekday: 1 });
    const wed = nextOccurrence(mon, ny, rule, anchor);
    expect(zonedParts(wed, ny)).toMatchObject({ year: 2026, month: 6, day: 10, weekday: 3 });
    const nextMon = nextOccurrence(wed, ny, rule, anchor);
    expect(zonedParts(nextMon, ny)).toMatchObject({ year: 2026, month: 6, day: 22, weekday: 1 });
  });

  it('skipMissedOccurrences jumps past fires older than max-lateness', () => {
    const tz = 'UTC';
    const start = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-04T12:00:00.000Z');
    const rule: RecurrenceRule = { kind: 'daily', interval: 1 };
    const { next, skipped } = skipMissedOccurrences(start, now, tz, rule, start, 3_600_000, null, 100);
    expect(skipped).toBeGreaterThanOrEqual(2);
    expect(next).not.toBeNull();
    expect(now.getTime() - next!.getTime()).toBeLessThanOrEqual(3_600_000);
  });

  it('skipMissedOccurrences returns null when remaining occurrences are exhausted', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-10T00:00:00.000Z');
    const { next, skipped } = skipMissedOccurrences(
      start,
      now,
      'UTC',
      { kind: 'daily', interval: 1 },
      start,
      3_600_000,
      null,
      2,
    );
    expect(next).toBeNull();
    expect(skipped).toBe(2);
  });

  it('parseUntilUtc treats a calendar date as end-of-day in the zone', () => {
    const until = parseUntilUtc('2026-06-15', 'Asia/Kolkata');
    const parts = zonedParts(until, 'Asia/Kolkata');
    expect(parts).toMatchObject({ year: 2026, month: 6, day: 15, hour: 23, minute: 59 });
  });
});
