import { BadRequestException } from '@nestjs/common';
import { assertIanaTimeZone, parseSendAtUtc } from './scheduler-time';

export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';

export const RECURRENCE_KINDS: RecurrenceKind[] = ['none', 'daily', 'weekly', 'monthly'];

export type RecurrenceRule = {
  kind: RecurrenceKind;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function zonedParts(date: Date, tz: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS.indexOf(map.weekday),
  };
}

/** Convert a civil datetime in `tz` to a UTC instant. DST gaps snap forward; overlaps pick the earlier offset. */
export function zonedToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = wanted;
  for (let i = 0; i < 4; i++) {
    const got = zonedParts(new Date(utc), tz);
    const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
    const delta = wanted - gotUtc;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  const got = zonedParts(new Date(utc), tz);
  const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
  // Gap: the civil time never occurs. Landed before the hole → skip forward to the first valid instant.
  if (gotUtc < wanted) utc += wanted - gotUtc;
  return new Date(utc);
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  n: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + n));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

export function addCalendarMonths(
  year: number,
  month: number,
  day: number,
  n: number,
): { year: number; month: number; day: number } {
  const idx = year * 12 + (month - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return { year: ny, month: nm, day: Math.min(day, lastDayOfMonth(ny, nm)) };
}

function weekStartMs(year: number, month: number, day: number): number {
  const utc = Date.UTC(year, month - 1, day);
  const weekday = new Date(utc).getUTCDay();
  return utc - weekday * 86_400_000;
}

export function parseUntilUtc(until: string, tz: string): Date {
  const trimmed = until.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    assertIanaTimeZone(tz);
    const [year, month, day] = trimmed.split('-').map(Number);
    return zonedToUtc(tz, year, month, day, 23, 59, 59);
  }
  return parseSendAtUtc(trimmed);
}

export function assertRecurrenceRule(rule: RecurrenceRule): void {
  if (!RECURRENCE_KINDS.includes(rule.kind)) {
    throw new BadRequestException(`Unknown recurrence: ${String(rule.kind)}`);
  }
  if (rule.kind === 'none') return;
  if (!Number.isInteger(rule.interval) || rule.interval < 1) {
    throw new BadRequestException('recurrence interval must be an integer >= 1');
  }
  if (rule.kind === 'weekly') {
    const days = rule.daysOfWeek ?? [];
    if (!days.length || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestException('weekly recurrence requires daysOfWeek as 0–6 (Sun–Sat)');
    }
  }
  if (rule.kind === 'monthly') {
    const day = rule.dayOfMonth;
    if (!Number.isInteger(day) || !day || day < 1 || day > 31) {
      throw new BadRequestException('monthly recurrence requires dayOfMonth 1–31');
    }
  }
}

/**
 * Next fire after `fromUtc` (exclusive) in `tz`. Clock time is preserved; monthly day 31 clamps
 * to the last day of shorter months. DST-correct via Intl.
 */
export function nextOccurrence(fromUtc: Date, tz: string, rule: RecurrenceRule, anchorUtc: Date): Date {
  assertIanaTimeZone(tz);
  assertRecurrenceRule(rule);
  if (rule.kind === 'none') {
    throw new BadRequestException('nextOccurrence requires a recurring rule');
  }
  const last = zonedParts(fromUtc, tz);
  const interval = rule.interval;

  if (rule.kind === 'daily') {
    const next = addCalendarDays(last.year, last.month, last.day, interval);
    return zonedToUtc(tz, next.year, next.month, next.day, last.hour, last.minute, last.second);
  }

  if (rule.kind === 'monthly') {
    const wantDay = rule.dayOfMonth ?? last.day;
    const next = addCalendarMonths(last.year, last.month, wantDay, interval);
    const day = Math.min(wantDay, lastDayOfMonth(next.year, next.month));
    return zonedToUtc(tz, next.year, next.month, day, last.hour, last.minute, last.second);
  }

  const days = [...new Set(rule.daysOfWeek ?? [])].sort((a, b) => a - b);
  const anchor = zonedParts(anchorUtc, tz);
  const anchorWeek = weekStartMs(anchor.year, anchor.month, anchor.day);
  let y = last.year;
  let m = last.month;
  let d = last.day;
  for (let i = 0; i < 400; i++) {
    const stepped = addCalendarDays(y, m, d, 1);
    y = stepped.year;
    m = stepped.month;
    d = stepped.day;
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (!days.includes(weekday)) continue;
    const weeks = Math.round((weekStartMs(y, m, d) - anchorWeek) / (7 * 86_400_000));
    if (weeks >= 0 && weeks % interval === 0) {
      return zonedToUtc(tz, y, m, d, last.hour, last.minute, last.second);
    }
  }
  throw new BadRequestException('Could not compute the next weekly occurrence');
}

/** Skip fires that are already beyond max-lateness rather than bursting after downtime. */
export function skipMissedOccurrences(
  fromUtc: Date,
  now: Date,
  tz: string,
  rule: RecurrenceRule,
  anchorUtc: Date,
  maxLatenessMs: number,
  untilUtc: Date | null,
  remaining: number,
): { next: Date | null; skipped: number } {
  let cursor = fromUtc;
  let skipped = 0;
  let left = remaining;
  for (let i = 0; i < 1000 && left > 0; i++) {
    const next = nextOccurrence(cursor, tz, rule, anchorUtc);
    if (untilUtc && next.getTime() > untilUtc.getTime()) return { next: null, skipped };
    const late = now.getTime() - next.getTime();
    if (late <= maxLatenessMs) return { next, skipped };
    cursor = next;
    skipped += 1;
    left -= 1;
  }
  return { next: null, skipped };
}
