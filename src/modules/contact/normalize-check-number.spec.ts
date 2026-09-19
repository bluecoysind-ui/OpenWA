import { normalizeCheckNumber } from './normalize-check-number';

describe('normalizeCheckNumber', () => {
  it('accepts digit strings of 5–15 digits', () => {
    expect(normalizeCheckNumber('628123456789')).toEqual({ ok: true, normalized: '628123456789' });
  });

  it('strips +, spaces, dashes, and parentheses', () => {
    expect(normalizeCheckNumber('+62 812-345-6789')).toEqual({ ok: true, normalized: '628123456789' });
  });

  it('accepts an individual user WID and returns its user-part', () => {
    expect(normalizeCheckNumber('628123456789@c.us')).toEqual({ ok: true, normalized: '628123456789' });
  });

  it('rejects empty, too-short, and non-number junk per item', () => {
    expect(normalizeCheckNumber('')).toEqual({ ok: false, error: 'empty' });
    expect(normalizeCheckNumber('   ')).toEqual({ ok: false, error: 'empty' });
    expect(normalizeCheckNumber('1234')).toEqual({ ok: false, error: 'invalid' });
    expect(normalizeCheckNumber('not-a-number')).toEqual({ ok: false, error: 'invalid' });
  });
});
