import { BadRequestException } from '@nestjs/common';

const HAS_OFFSET = /Z$|[+-]\d{2}:?\d{2}$/;

/** True when `tz` is an IANA zone Node's Intl can resolve. No extra timezone library. */
export function isIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
    return true;
  } catch {
    return false;
  }
}

export function assertIanaTimeZone(tz: string): void {
  if (!isIanaTimeZone(tz)) {
    throw new BadRequestException(`Unknown IANA timezone: ${tz}`);
  }
}

/**
 * Parse `sendAt` as an ISO-8601 *instant* (offset required). Wall-clock-in-zone conversion is
 * deferred: without a timezone library, treating a naive local datetime as UTC is a silent DST
 * bug, so we refuse naive strings rather than guess.
 */
export function parseSendAtUtc(sendAt: string): Date {
  const trimmed = sendAt.trim();
  if (!HAS_OFFSET.test(trimmed)) {
    throw new BadRequestException(
      'sendAt must be an ISO-8601 instant with an offset (e.g. 2026-09-21T15:00:00Z or ...+05:30)',
    );
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw new BadRequestException('sendAt is not a valid ISO-8601 datetime');
  }
  return new Date(ms);
}

/** Pacing 429 backoff: 30s, 60s, 120s, … capped at 15 minutes. */
export function pacingBackoffMs(attemptCount: number): number {
  const base = 30_000;
  const cap = 15 * 60_000;
  const exp = Math.max(0, attemptCount);
  return Math.min(cap, base * 2 ** exp);
}
