import { escapeLikePattern } from './like-escape';

describe('escapeLikePattern', () => {
  it('escapes LIKE wildcards and backslashes', () => {
    expect(escapeLikePattern('100%_off\\today')).toBe('100\\%\\_off\\\\today');
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeLikePattern('hello')).toBe('hello');
  });
});
