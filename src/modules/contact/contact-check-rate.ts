import { HttpException, HttpStatus } from '@nestjs/common';

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_KEYS = 5_000;

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 1 ? i : fallback;
};

export function readContactCheckRateConfig(env: NodeJS.ProcessEnv = process.env): {
  max: number;
  windowMs: number;
} {
  return {
    max: parsePositiveInt(env.CONTACT_CHECK_RATE_MAX, DEFAULT_MAX),
    windowMs: parsePositiveInt(env.CONTACT_CHECK_RATE_WINDOW_MS, DEFAULT_WINDOW_MS),
  };
}

/** Per-session sliding window for POST /contacts/check (number enumeration). */
export class ContactCheckRateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  check(sessionId: string): void {
    const t = this.now();
    const recent = (this.hits.get(sessionId) ?? []).filter(ts => t - ts < this.windowMs);
    const throttled = recent.length >= this.max;
    if (!throttled) recent.push(t);
    this.hits.delete(sessionId);
    this.hits.set(sessionId, recent);
    while (this.hits.size > DEFAULT_MAX_KEYS) {
      const oldest = this.hits.keys().next().value;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
    if (throttled) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'contact check rate limit exceeded',
          code: 'CONTACT_CHECK_RATE',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
