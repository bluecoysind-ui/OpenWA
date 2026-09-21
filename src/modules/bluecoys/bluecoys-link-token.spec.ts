import { linkTokensMatch } from './bluecoys-link-token';

describe('linkTokensMatch', () => {
  it('allows any token when secret unset', () => {
    expect(linkTokensMatch('', 'anything')).toBe(true);
  });

  it('requires exact match when secret set', () => {
    expect(linkTokensMatch('secret', 'secret')).toBe(true);
    expect(linkTokensMatch('secret', 'wrong')).toBe(false);
    expect(linkTokensMatch('secret', undefined)).toBe(false);
  });
});
