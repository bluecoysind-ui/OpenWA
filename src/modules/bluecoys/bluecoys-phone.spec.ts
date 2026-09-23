import { sessionNameForUsername } from './bluecoys-phone';

describe('sessionNameForUsername', () => {
  it('prefixes, sanitizes and keys the session by (user, number)', () => {
    expect(sessionNameForUsername('Jane.Doe', '919608079512')).toBe('bc-jane-doe-919608079512');
  });

  it('gives each WhatsApp number of the same user its own session', () => {
    expect(sessionNameForUsername('jane', '919608079512')).not.toBe(sessionNameForUsername('jane', '919999999999'));
  });

  it('never exceeds the 50-char session-name limit', () => {
    const name = sessionNameForUsername('a-very-long-username-that-goes-on-and-on-forever', '123456789012345');
    expect(name.length).toBeLessThanOrEqual(50);
    expect(name).toMatch(/^bc-[a-z0-9-]+-123456789012345$/);
  });

  it('rejects an unusable username or phone', () => {
    expect(() => sessionNameForUsername('!!!', '919608079512')).toThrow();
    expect(() => sessionNameForUsername('jane', '')).toThrow();
  });
});
