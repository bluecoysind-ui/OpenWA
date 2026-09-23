/** Prefer WhatsApp push name over the local session slug or a UUID-as-name. */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SessionLabelInput = {
  id?: string;
  sessionId?: string;
  name?: string | null;
  pushName?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
};

export function sessionDisplayName(session: SessionLabelInput): string {
  const push = session.pushName?.trim();
  if (push) return push;
  const name = session.name?.trim();
  if (name && !UUID_RE.test(name)) return name;
  const phone = (session.phoneNumber || session.phone)?.trim();
  if (phone) return phone;
  return name || session.sessionId || session.id || "Account";
}

export function sessionInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const compact = label.replace(/[^a-zA-Z0-9]/g, "");
  return (compact.slice(0, 2) || "?").toUpperCase();
}

/** Accounts rail: live or in-progress link only — failed/disconnected rows stay in Settings. */
export function sessionShownInAccounts(status: string): boolean {
  return status === "connected" || status === "connecting" || status === "qr_ready";
}

function isPhoneLikeName(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return false;
  return /^[+]?[\d\s().-]+$/.test(value.trim());
}

/** Saved address-book name first, then WhatsApp push name — never a phone number. */
export function contactDisplayName(
  contact?: { name?: string | null; pushName?: string | null; verifiedName?: string | null } | null,
): string {
  for (const raw of [contact?.name, contact?.pushName, contact?.verifiedName]) {
    const value = raw?.trim();
    if (value && !isPhoneLikeName(value)) return value;
  }
  return "";
}
