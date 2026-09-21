import { isIndividualWid, parseWaId, userPart } from '../../engine/identity/wa-id';

const DIGITS = /^\d{5,15}$/;

export function normalizeCheckNumber(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  const stripped = trimmed.replace(/^\+/, '').replace(/[\s()-]/g, '');
  if (DIGITS.test(stripped)) return { ok: true, normalized: stripped };
  if (isIndividualWid(trimmed) && parseWaId(trimmed).kind === 'user') {
    return { ok: true, normalized: userPart(trimmed) };
  }
  return { ok: false, error: 'invalid' };
}
