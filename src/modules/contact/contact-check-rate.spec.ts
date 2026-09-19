import { HttpException, HttpStatus } from '@nestjs/common';
import { ContactCheckRateLimiter, readContactCheckRateConfig } from './contact-check-rate';

describe('ContactCheckRateLimiter', () => {
  it('allows up to max hits in the window and 429s the next', () => {
    const now = 1_000;
    const limiter = new ContactCheckRateLimiter(2, 60_000, () => now);
    limiter.check('s1');
    limiter.check('s1');
    expect(() => limiter.check('s1')).toThrow(HttpException);
    try {
      limiter.check('s1');
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((err as HttpException).getResponse()).toEqual(expect.objectContaining({ code: 'CONTACT_CHECK_RATE' }));
    }
  });

  it('isolates sessions', () => {
    const limiter = new ContactCheckRateLimiter(1, 60_000, () => 1);
    limiter.check('s1');
    expect(() => limiter.check('s2')).not.toThrow();
  });

  it('readContactCheckRateConfig falls back to 10 / 60s', () => {
    expect(readContactCheckRateConfig({})).toEqual({ max: 10, windowMs: 60_000 });
    expect(readContactCheckRateConfig({ CONTACT_CHECK_RATE_MAX: '3', CONTACT_CHECK_RATE_WINDOW_MS: '5000' })).toEqual({
      max: 3,
      windowMs: 5_000,
    });
  });
});
