export type SessionNameIssue = "empty" | "format" | "too-long" | "duplicate";

const NAME_FORMAT = /^[a-z0-9-]+$/;
const NAME_MAX_LENGTH = 50;

export function sessionNameIssues(name: string, existingNames: string[]): SessionNameIssue[] {
  if (!name.trim()) return ["empty"];
  const issues: SessionNameIssue[] = [];
  if (!NAME_FORMAT.test(name)) issues.push("format");
  if (name.length > NAME_MAX_LENGTH) issues.push("too-long");
  if (issues.length === 0 && existingNames.includes(name)) issues.push("duplicate");
  return issues;
}

export function canCreateSession(name: string, existingNames: string[]): boolean {
  return sessionNameIssues(name, existingNames).length === 0;
}

export function isValidPairingPhone(phone: string): boolean {
  return /^[0-9]{6,15}$/.test(phone.trim());
}

const PROXY_PROTOCOLS = new Set(["http:", "https:", "socks4:", "socks5:"]);

export function isValidProxyUrl(url: string): boolean {
  try {
    return PROXY_PROTOCOLS.has(new URL(url.trim()).protocol);
  } catch {
    return false;
  }
}

const STATUS_GROUPS: Record<string, string[]> = {
  active: ["ready"],
  connecting: ["initializing", "authenticating", "qr_ready"],
  inactive: ["created", "disconnected", "action_required", "failed"],
};

export function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  return (STATUS_GROUPS[filter] ?? []).includes(status);
}

export function filterSessions<T extends { id: string; name: string; status: string }>(
  sessions: T[],
  search: string,
  statusFilter: string,
): T[] {
  const needle = search.toLowerCase();
  return sessions.filter(
    (s) =>
      (s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)) &&
      matchesStatusFilter(s.status, statusFilter),
  );
}
