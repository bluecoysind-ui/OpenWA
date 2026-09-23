/** WhatsApp group invite codes are a short alphanumeric token in the path. */
const INVITE_CODE_RE = /^[A-Za-z0-9_-]{16,32}$/;

export type GroupTarget =
  | { kind: "invite"; code: string }
  | { kind: "jid"; groupId: string }
  | { kind: "none" };

function looksLikeInviteCode(value: string): boolean {
  return INVITE_CODE_RE.test(value);
}

function hostIsChatWhatsApp(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return host === "chat.whatsapp.com";
}

/**
 * Pull the invite token out of a chat.whatsapp.com URL (query-string included),
 * a bare code, or a group JID. Query flags like `?s=cl&p=a&mlu=4&ilr=4` are ignored.
 */
export function parseGroupInviteCode(input: string): string | null {
  const target = parseGroupTarget(input);
  return target.kind === "invite" ? target.code : null;
}

export function parseGroupTarget(input: string): GroupTarget {
  const raw = input.trim();
  if (!raw) return { kind: "none" };

  const jid = raw.replace(/^https?:\/\//i, "");
  if (/@g\.us$/i.test(jid) && !/\s/.test(jid)) {
    return { kind: "jid", groupId: jid.split(/[?#]/)[0] };
  }

  const asUrl = raw.includes("://") ? raw : hostIsChatWhatsApp(raw.split("/")[0] ?? "") ? `https://${raw}` : null;
  if (asUrl) {
    try {
      const url = new URL(asUrl);
      if (hostIsChatWhatsApp(url.hostname)) {
        const segments = url.pathname.split("/").filter(Boolean);
        const code = segments[segments.length - 1] ?? "";
        if (looksLikeInviteCode(code)) return { kind: "invite", code };
        return { kind: "none" };
      }
    } catch {
      /* fall through to bare-token handling */
    }
  }

  const token = raw.split(/[/?#\s]/)[0] ?? "";
  if (looksLikeInviteCode(token)) return { kind: "invite", code: token };
  return { kind: "none" };
}
