import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { localDateTimeToIsoInstant, timeZoneOffsetMinutes } from './akg-datetime.ts';

describe('localDateTimeToIsoInstant', () => {
  it('keeps Asia/Kolkata at +05:30 (no DST)', () => {
    assert.equal(localDateTimeToIsoInstant('2026-09-21T15:00', 'Asia/Kolkata'), '2026-09-21T15:00:00+05:30');
  });

  it('uses EST (−05:00) in January in America/New_York', () => {
    assert.equal(localDateTimeToIsoInstant('2026-01-15T12:00', 'America/New_York'), '2026-01-15T12:00:00-05:00');
  });

  it('uses EDT (−04:00) in July in America/New_York (DST-correct)', () => {
    assert.equal(localDateTimeToIsoInstant('2026-07-15T12:00', 'America/New_York'), '2026-07-15T12:00:00-04:00');
  });

  it('emits Z for UTC', () => {
    assert.equal(localDateTimeToIsoInstant('2026-01-01T00:00:00', 'UTC'), '2026-01-01T00:00:00Z');
  });

  it('rejects a naive datetime without the T separator', () => {
    assert.throws(() => localDateTimeToIsoInstant('2026-01-01 00:00', 'UTC'), /YYYY-MM-DD/);
  });

  it('reads a positive offset east of UTC at a known instant', () => {
    const utc = Date.UTC(2026, 0, 1, 6, 30, 0);
    assert.equal(timeZoneOffsetMinutes(utc, 'Asia/Kolkata'), 330);
  });
});
