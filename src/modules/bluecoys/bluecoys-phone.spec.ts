import { sessionNameForUsername } from './bluecoys-phone';

describe('sessionNameForUsername', () => {
  it('prefixes and sanitizes', () => {
    expect(sessionNameForUsername('Jane.Doe')).toBe('bc-jane-doe');
  });
});
