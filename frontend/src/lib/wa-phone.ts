/**
 * Normalize WhatsApp ids to a displayable phone string for scrapers and directory rows.
 * Unresolved LIDs are labeled `lid:<digits>` — not a dialable MSISDN.
 */

export function isDialablePhone(phone: string): boolean {
  return /^\d{6,}$/.test(phone);
}

export function extractScrapePhone(jid: string, reportedNumber?: string | null): string {
  const raw = (jid ?? "").trim();
  const lower = raw.toLowerCase();

  if (lower === "status@broadcast") return "";

  const at = lower.lastIndexOf("@");
  const domain = at === -1 ? "" : lower.slice(at + 1);
  const local = at === -1 ? lower : lower.slice(0, at).split(":")[0];
  const isLid = domain === "lid" || domain === "hosted.lid";
  const isUser = domain === "c.us" || domain === "s.whatsapp.net" || domain === "hosted";

  if (isUser && /^\d+$/.test(local)) return local;

  const fromReported = digitsFromReported(reportedNumber);
  // A LID's own user-part is often stuffed into `number`. That is not a phone.
  if (fromReported && !(isLid && fromReported === local)) return fromReported;

  if (isLid) return local ? `lid:${local}` : raw;
  if (domain === "g.us") return "";

  if (at === -1) {
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 6 ? digits : raw;
  }

  const fallback = local.replace(/\D/g, "");
  return fallback.length >= 6 ? fallback : raw;
}

function digitsFromReported(reportedNumber?: string | null): string | null {
  if (reportedNumber == null) return null;
  const trimmed = String(reportedNumber).trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const fromJid = extractScrapePhone(trimmed, null);
    return isDialablePhone(fromJid) ? fromJid : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (!isDialablePhone(digits)) return null;
  return digits;
}

export function isScrapableMemberJid(jid: string): boolean {
  const lower = jid.trim().toLowerCase();
  if (!lower || lower.endsWith("@g.us")) return false;
  if (lower === "status@broadcast") return false;
  return lower.includes("@");
}
