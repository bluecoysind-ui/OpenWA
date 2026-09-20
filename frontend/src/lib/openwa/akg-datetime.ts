/**
 * Convert a local wall-clock datetime + IANA timezone into an ISO-8601 instant WITH offset.
 * DST-correct: the offset is read from Intl at the resolved instant (two-pass).
 */

export function listTimeZones(): string[] {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
    if (typeof intl.supportedValuesOf === 'function') {
      return intl.supportedValuesOf('timeZone');
    }
  } catch {
    /* ignore */
  }
  return [
    'UTC',
    'Asia/Kolkata',
    'Asia/Jakarta',
    'Asia/Singapore',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Australia/Sydney',
  ];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Offset of `timeZone` from UTC, in minutes, at the given UTC instant (east of UTC is positive). */
export function timeZoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const num = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
  const asUtc = Date.UTC(num('year'), num('month') - 1, num('day'), num('hour'), num('minute'), num('second'));
  return (asUtc - utcMs) / 60_000;
}

function formatOffset(offsetMin: number): string {
  if (offsetMin === 0) return 'Z';
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * @param local `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` (no offset)
 * @param timeZone IANA name, e.g. `Asia/Kolkata`
 */
export function localDateTimeToIsoInstant(local: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) {
    throw new Error('local datetime must be YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss');
  }
  if (!timeZone.trim()) throw new Error('timezone is required');
  const [date, time] = local.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = desiredAsUtc;
  utc = desiredAsUtc - timeZoneOffsetMinutes(utc, timeZone) * 60_000;
  utc = desiredAsUtc - timeZoneOffsetMinutes(utc, timeZone) * 60_000;
  const offsetMin = timeZoneOffsetMinutes(utc, timeZone);
  return `${date}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offsetMin)}`;
}

/** Format an ISO instant as `YYYY-MM-DDTHH:mm` wall-clock in `timeZone` (for datetime-local). */
export function isoInstantToLocalDateTime(iso: string, timeZone: string): string {
  const utcMs = Date.parse(iso);
  if (!Number.isFinite(utcMs)) throw new Error('invalid instant');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const num = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '00';
  return `${num('year')}-${num('month')}-${num('day')}T${num('hour')}:${num('minute')}`;
}
