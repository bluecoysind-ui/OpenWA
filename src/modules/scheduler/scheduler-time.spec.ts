import { BadRequestException } from '@nestjs/common';
import { assertIanaTimeZone, isIanaTimeZone, pacingBackoffMs, parseSendAtUtc } from './scheduler-time';

describe('scheduler-time', () => {
  it('accepts IANA zones Node can resolve and rejects junk', () => {
    expect(isIanaTimeZone('UTC')).toBe(true);
    expect(isIanaTimeZone('Asia/Jakarta')).toBe(true);
    expect(isIanaTimeZone('Not/AZone')).toBe(false);
    expect(() => assertIanaTimeZone('Not/AZone')).toThrow(BadRequestException);
  });

  it('requires an offset on sendAt and stores the instant', () => {
    expect(parseSendAtUtc('2026-09-21T15:00:00Z').toISOString()).toBe('2026-09-21T15:00:00.000Z');
    expect(parseSendAtUtc('2026-09-21T20:30:00+05:30').toISOString()).toBe('2026-09-21T15:00:00.000Z');
    expect(() => parseSendAtUtc('2026-09-21T15:00:00')).toThrow(/offset/);
  });

  it('backs off 30s × 2^attempt, capped at 15 minutes', () => {
    expect(pacingBackoffMs(0)).toBe(30_000);
    expect(pacingBackoffMs(1)).toBe(60_000);
    expect(pacingBackoffMs(2)).toBe(120_000);
    expect(pacingBackoffMs(10)).toBe(15 * 60_000);
  });
});
