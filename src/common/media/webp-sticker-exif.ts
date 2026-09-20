/**
 * WhatsApp sticker-pack EXIF for WebP. Small in-repo writer (no extra dependency): a TIFF EXIF
 * payload with sticker-pack-name / sticker-pack-publisher, inserted as a WebP EXIF chunk.
 *
 * Existing WebP is rewritten only when pack metadata is supplied; send-sticker passthrough stays
 * byte-identical when pack fields are omitted.
 */

const RIFF = Buffer.from('RIFF');
const WEBP = Buffer.from('WEBP');

export function isWebpBuffer(data: Buffer): boolean {
  return data.length >= 12 && data.subarray(0, 4).equals(RIFF) && data.subarray(8, 12).equals(WEBP);
}

export function buildWhatsAppStickerExif(packName: string, author: string): Buffer {
  const json = Buffer.from(
    JSON.stringify({
      'sticker-pack-id': 'openwa.sticker',
      'sticker-pack-name': packName,
      'sticker-pack-publisher': author,
    }),
    'utf8',
  );
  const attr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16,
    0x00, 0x00, 0x00,
  ]);
  attr.writeUIntLE(json.length, 14, 4);
  return Buffer.concat([attr, json]);
}

function padEven(payload: Buffer): Buffer {
  return payload.length % 2 === 1 ? Buffer.concat([payload, Buffer.from([0])]) : payload;
}

function chunk(fourcc: Buffer, payload: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length, 0);
  return Buffer.concat([fourcc, size, padEven(payload)]);
}

interface WebpChunk {
  fourcc: string;
  payload: Buffer;
}

function parseChunks(webp: Buffer): WebpChunk[] {
  const chunks: WebpChunk[] = [];
  let offset = 12;
  while (offset + 8 <= webp.length) {
    const fourcc = webp.subarray(offset, offset + 4).toString('ascii');
    const size = webp.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > webp.length) break;
    chunks.push({ fourcc, payload: webp.subarray(start, end) });
    offset = end + (size % 2);
  }
  return chunks;
}

function assemble(chunks: WebpChunk[]): Buffer {
  const body = Buffer.concat(chunks.map(c => chunk(Buffer.from(c.fourcc), c.payload)));
  const header = Buffer.alloc(12);
  RIFF.copy(header, 0);
  header.writeUInt32LE(4 + body.length, 4);
  WEBP.copy(header, 8);
  return Buffer.concat([header, body]);
}

/** Embed WhatsApp pack EXIF. No-op when both name and author are empty. */
export function applyStickerPackExif(webp: Buffer, packName?: string | null, author?: string | null): Buffer {
  const name = packName?.trim() ?? '';
  const publisher = author?.trim() ?? '';
  if (!name && !publisher) return webp;
  if (!isWebpBuffer(webp)) return webp;
  const exif = buildWhatsAppStickerExif(name || 'OpenWA', publisher || 'OpenWA');
  const chunks = parseChunks(webp).filter(c => c.fourcc !== 'EXIF');
  if (chunks.length === 0) return webp;

  if (chunks[0].fourcc === 'VP8X' && chunks[0].payload.length >= 1) {
    const flags = Buffer.from(chunks[0].payload);
    flags[0] |= 0x08;
    chunks[0] = { fourcc: 'VP8X', payload: flags };
  }
  chunks.push({ fourcc: 'EXIF', payload: exif });
  return assemble(chunks);
}
