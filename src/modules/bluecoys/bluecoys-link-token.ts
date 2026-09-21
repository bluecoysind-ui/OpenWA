import { timingSafeEqual } from 'node:crypto';

/** Constant-time compare for optional link-qr shared secret. */
export function linkTokensMatch(expected: string, provided: string | undefined): boolean {
  if (!expected) return true;
  if (provided === undefined) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
