import { phonesMatch, readBluecoysConfig } from './bluecoys-session.util';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME } from './bluecoys.types';

describe('readBluecoysConfig', () => {
  it('returns meta when both fields exist', () => {
    expect(
      readBluecoysConfig({
        [BLUECOYS_CONFIG_USERNAME]: 'jane',
        [BLUECOYS_CONFIG_PHONE]: '919608079512',
      }),
    ).toEqual({
      [BLUECOYS_CONFIG_USERNAME]: 'jane',
      [BLUECOYS_CONFIG_PHONE]: '919608079512',
    });
  });
});

describe('phonesMatch', () => {
  it('compares digit forms across jid styles', () => {
    expect(phonesMatch('919608079512', '919608079512@c.us')).toBe(true);
    expect(phonesMatch('919608079512', '918000000000@c.us')).toBe(false);
  });
});
