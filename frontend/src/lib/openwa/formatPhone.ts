/** Display helpers for WhatsApp JIDs (mirrors bundled dashboard). */

export function parsePhoneFromJid(jid: string): string | null {
  if (!jid) return null;
  const [local, domain] = jid.split("@");
  if (domain && !domain.startsWith("c.us") && domain !== "s.whatsapp.net") return null;
  const user = local.split(":")[0];
  if (!/^\d+$/.test(user)) return null;
  return user;
}

export function formatPhoneForDisplay(phoneOrJid: string): string | null {
  const digits = /^\d+$/.test(phoneOrJid) ? phoneOrJid : parsePhoneFromJid(phoneOrJid);
  if (!digits) return null;
  if (digits.length <= 4) return `+${digits}`;

  let ccLen = 2;
  if (digits.length === 11 && digits[0] === "1") ccLen = 1;
  else if (digits.length <= 6) ccLen = 1;

  const cc = digits.slice(0, ccLen);
  const rest = digits.slice(ccLen);
  if (rest.length <= 4) return `+${cc} ${rest}`;
  const last4 = rest.slice(-4);
  const prefix = rest.slice(0, -4);
  const prefixGroups = prefix.match(/.{1,3}/g) ?? [prefix];
  return `+${cc} ${[...prefixGroups, last4].join(" ")}`;
}
