export type AccountQuota = { sessionId: string; count: number };

export type MemberAssignment = { sessionId: string; phones: string[] };

export type MemberPlan = {
  assignments: MemberAssignment[];
  leftover: string[];
  planned: number;
};

/** Split a pasted contact name into WhatsApp address-book first/last. */
export function splitContactName(name: string | undefined, fallback: string): { firstName: string; lastName?: string } {
  const base = (name?.trim() || fallback.trim() || "Contact").slice(0, 200);
  const parts = base.split(/\s+/).filter(Boolean);
  const firstName = (parts[0] ?? "Contact").slice(0, 100);
  if (parts.length <= 1) return { firstName };
  return { firstName, lastName: parts.slice(1).join(" ").slice(0, 100) };
}

export function contactJid(phone: string): string {
  if (phone.includes("@")) return phone;
  return `${phone.replace(/\D/g, "")}@c.us`;
}

/** delay + a random 0..jitter, inclusive. `random` is injectable for tests. */
export function delayWithJitter(baseMs: number, jitterMs: number, random: () => number = Math.random): number {
  const base = Math.max(0, Math.floor(Number(baseMs) || 0));
  const jitter = Math.max(0, Math.floor(Number(jitterMs) || 0));
  const unit = random();
  const span = Number.isFinite(unit) ? Math.min(1, Math.max(0, unit)) : 0;
  return base + Math.min(jitter, Math.floor(span * (jitter + 1)));
}

export async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  const wait = Math.max(0, Math.floor(ms));
  if (wait === 0) {
    if (signal?.aborted) throw abortError();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, wait);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    if (signal?.aborted) {
      clearTimeout(timer);
      reject(abortError());
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(): Error {
  return typeof DOMException === "function" ? new DOMException("Aborted", "AbortError") : Object.assign(new Error("Aborted"), { name: "AbortError" });
}

/**
 * Assign phones to selected accounts in order, up to each account's quota.
 * Extra numbers stay in `leftover` rather than overflowing a quota.
 */
export function allocateMembers(phones: string[], quotas: AccountQuota[]): MemberPlan {
  const assignments: MemberAssignment[] = quotas.map((q) => ({ sessionId: q.sessionId, phones: [] }));
  let cursor = 0;
  for (let i = 0; i < quotas.length; i++) {
    const take = Math.max(0, Math.floor(quotas[i]!.count));
    if (take === 0) continue;
    const slice = phones.slice(cursor, cursor + take);
    assignments[i]!.phones = slice;
    cursor += slice.length;
  }
  return {
    assignments: assignments.filter((a) => a.phones.length > 0),
    leftover: phones.slice(cursor),
    planned: cursor,
  };
}

/** Fill every selected account with the same quota (All Accounts + members-per-account). */
export function quotasFromPerAccount(sessionIds: string[], membersPerAccount: number): AccountQuota[] {
  const n = Math.max(0, Math.floor(membersPerAccount));
  return sessionIds.map((sessionId) => ({ sessionId, count: n }));
}

/** Spread every number across accounts as evenly as possible. */
export function evenSplitQuotas(sessionIds: string[], phoneCount: number): AccountQuota[] {
  const n = sessionIds.length;
  if (!n) return [];
  const total = Math.max(0, Math.floor(phoneCount));
  const base = Math.floor(total / n);
  const extra = total % n;
  return sessionIds.map((sessionId, i) => ({ sessionId, count: base + (i < extra ? 1 : 0) }));
}

/**
 * Per-account override wins; otherwise the shared members-per-account value;
 * otherwise an even split of the pasted list.
 */
export function resolveQuotas(args: {
  sessionIds: string[];
  membersPerAccount: number | null;
  overrides: Record<string, number | null>;
  phoneCount: number;
}): AccountQuota[] {
  const shared = args.membersPerAccount != null && args.membersPerAccount >= 0 ? Math.floor(args.membersPerAccount) : null;
  const fallback = shared == null ? evenSplitQuotas(args.sessionIds, args.phoneCount) : quotasFromPerAccount(args.sessionIds, shared);
  const byId = new Map(fallback.map((q) => [q.sessionId, q.count]));
  return args.sessionIds.map((sessionId) => {
    const over = args.overrides[sessionId];
    const count = over != null && over >= 0 ? Math.floor(over) : (byId.get(sessionId) ?? 0);
    return { sessionId, count };
  });
}
