import { buildQuotedMessage, quotedHasMedia } from './quoted-payload';

describe('quoted-payload', () => {
  it('keeps id+body and adds type/hasMedia/caption only when known', () => {
    expect(buildQuotedMessage({ id: 'q1', body: 'hi' })).toEqual({ id: 'q1', body: 'hi' });
    expect(buildQuotedMessage({ id: 'q1', body: 'cap', type: 'image', caption: 'cap' })).toEqual({
      id: 'q1',
      body: 'cap',
      type: 'image',
      caption: 'cap',
      hasMedia: true,
    });
  });

  it('does not invent fileUrl', () => {
    expect(buildQuotedMessage({ id: 'q1', body: 'x', type: 'image' }).fileUrl).toBeUndefined();
  });

  it('quotedHasMedia is true only for media types', () => {
    expect(quotedHasMedia('image')).toBe(true);
    expect(quotedHasMedia('text')).toBe(false);
    expect(quotedHasMedia(undefined)).toBe(false);
  });
});
