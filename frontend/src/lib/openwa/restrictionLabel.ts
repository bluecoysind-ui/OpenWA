import type { AccountRestriction } from "@/lib/openwa-api";

const LABELS: Record<AccountRestriction["kind"], string> = {
  reachout_timelock: "Temporary send limit — wait before messaging new chats",
  tos_block: "Account restricted by WhatsApp (terms violation)",
  proxy_block: "Connection blocked — check proxy or network",
};

export function restrictionTooltip(r: AccountRestriction): string {
  const base = LABELS[r.kind] ?? r.kind;
  const code = r.code ? ` (${r.code})` : "";
  const exp = r.expiresAt ? ` · until ${new Date(r.expiresAt).toLocaleString()}` : "";
  return `${base}${code}${exp}`;
}
