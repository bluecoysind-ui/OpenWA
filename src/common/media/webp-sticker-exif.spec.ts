import { applyStickerPackExif, isWebpBuffer } from './webp-sticker-exif';

/** Tiny RIFF/WEBP with a VP8 chunk — enough for the writer to parse, not a real image. */
function minimalWebp(vp8x = false): Buffer {
  const payload = Buffer.alloc(10);
  const fourcc = Buffer.from(vp8x ? 'VP8X' : 'VP8 ');
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length, 0);
  const body = Buffer.concat([fourcc, size, payload]);
  const header = Buffer.alloc(12);
  Buffer.from('RIFF').copy(header, 0);
  header.writeUInt32LE(4 + body.length, 4);
  Buffer.from('WEBP').copy(header, 8);
  return Buffer.concat([header, body]);
}

describe('applyStickerPackExif', () => {
  it('is a no-op when pack fields are omitted, so existing WebP stays byte-identical', () => {
    const webp = minimalWebp();
    expect(applyStickerPackExif(webp)).toBe(webp);
    expect(applyStickerPackExif(webp, '', '')).toBe(webp);
  });

  it('leaves non-WebP bytes alone', () => {
    const png = Buffer.from('not-webp');
    expect(applyStickerPackExif(png, 'Pack', 'Author')).toBe(png);
  });

  it('inserts an EXIF chunk with pack name and publisher', () => {
    const tagged = applyStickerPackExif(minimalWebp(true), 'OpenPack', 'OpenAuthor');
    expect(isWebpBuffer(tagged)).toBe(true);
    expect(tagged.includes(Buffer.from('EXIF'))).toBe(true);
    expect(tagged.toString('utf8')).toContain('sticker-pack-name');
    expect(tagged.toString('utf8')).toContain('OpenPack');
    expect(tagged.toString('utf8')).toContain('OpenAuthor');
    expect(tagged[12 + 8] & 0x08).toBe(0x08);
  });
});
