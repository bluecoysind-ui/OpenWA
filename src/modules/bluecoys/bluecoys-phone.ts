export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * OpenWA session name for one (Bluecoys user, WhatsApp number) pair: `bc-<username>-<number>`.
 *
 * The number is part of the name on purpose: a Bluecoys user may link SEVERAL WhatsApp accounts,
 * and each one needs its own OpenWA session (its own QR/pairing, its own credentials, its own
 * ready/disconnected hooks → its own reward callback). Keying the session by user alone would
 * make the second number collide with the first and be refused.
 *
 * Session names must be 3–50 chars of [a-z0-9-] (CreateSessionDto). The number is at most 15
 * digits, so the username slug is capped at 31 chars to always fit: 3 + 31 + 1 + 15 = 50.
 */
export function sessionNameForUsername(username: string, phoneDigits: string): string {
  const slug = username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 31)
    .replace(/-$/, '');
  const phone = digitsOnlyPhone(phoneDigits).slice(0, 15);
  const name = `bc-${slug}-${phone}`;
  if (slug.length < 1 || phone.length < 1 || name.length < 3) {
    throw new Error('username/phone must yield a usable session name');
  }
  return name;
}
