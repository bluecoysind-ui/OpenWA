import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadContactsCsv,
  listGroups,
  scrapeContacts,
  scrapeGroups,
  type GroupRow,
  type ScrapedContact,
} from "@/lib/gateway-client";
import { parseRecipients } from "./Broadcast";
import { useGateway } from "@/store/gateway-store";
import { isDialablePhone } from "@/lib/wa-phone";
import { cn } from "@/lib/cn";
import { sessionDisplayName } from "@/lib/openwa/sessionLabel";
import { parseGroupTarget } from "@/lib/openwa/groupInvite";
import { allocateMembers, resolveQuotas } from "@/lib/openwa/addToGroupPlan";
import { addAssignedPhones, addProgressStats, resolveGroupTarget, type AddProgressRow } from "@/lib/openwa/addToGroupRun";
import { liveAddToGroupApis } from "@/lib/openwa/addToGroupLive";
import { parseScraperContactsCsv } from "@/lib/openwa/scraperCsv";

const field =
  "w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-left text-sm text-ink outline-none placeholder:text-dim";
const label = "block text-left text-[11px] font-medium uppercase tracking-wide text-muted";

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 text-[11.5px] text-muted">{sub}</p>
      {children}
    </section>
  );
}

/** Checkbox list of connected accounts, with select-all. */
function AccountPicker({ selected, onToggle, onAll }: { selected: string[]; onToggle: (id: string) => void; onAll: (on: boolean) => void }) {
  const sessions = useGateway((s) => s.sessions);
  const connected = sessions.filter((s) => s.status === "connected");
  const allOn = connected.length > 0 && connected.every((s) => selected.includes(s.sessionId));
  if (connected.length === 0) {
    return <p className="rounded-xl border border-line bg-night/30 px-3 py-2 text-[11px] text-danger">No connected account.</p>;
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={label}>Accounts</span>
        {connected.length > 1 ? (
          <button type="button" className="text-[11px] text-indigo hover:underline" onClick={() => onAll(!allOn)}>
            {allOn ? "Clear all" : "Select all"}
          </button>
        ) : null}
      </div>
      <div className="scroll-thin mt-1 max-h-32 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1">
        {connected.map((s) => (
          <label key={s.sessionId} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
            <input type="checkbox" checked={selected.includes(s.sessionId)} onChange={() => onToggle(s.sessionId)} className="accent-wa" />
            <span className="min-w-0 flex-1 truncate">
              {s.name || s.sessionId}
              {s.phoneNumber ? <span className="text-dim"> · {s.phoneNumber}</span> : null}
            </span>
            {s.proxy ? <span className="shrink-0 rounded-full border border-indigo/40 px-1.5 text-[9px] text-indigo">proxy</span> : null}
          </label>
        ))}
      </div>
    </div>
  );
}

function PhoneCell({ phone }: { phone: string }) {
  if (!isDialablePhone(phone)) {
    return (
      <span className="text-dim" title="WhatsApp did not share this member's phone number">
        Hidden
      </span>
    );
  }
  return <span className="font-mono">{phone}</span>;
}
function ResultTable({ contacts, filename }: { contacts: ScrapedContact[]; filename: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) => c.phone.includes(s) || (c.name ?? "").toLowerCase().includes(s));
  }, [contacts, q]);
  if (contacts.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${contacts.length}…`} className={cn(field, "h-8 py-1")} />
        <button
          type="button"
          onClick={() => downloadContactsCsv(shown, filename)}
          className="shrink-0 rounded-xl bg-wa px-3 py-1.5 text-xs font-semibold text-night"
        >
          ⬇ CSV ({shown.length})
        </button>
      </div>
      <div className="scroll-thin max-h-72 overflow-auto rounded-xl border border-line">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-night/80 text-left text-muted">
            <tr>
              <th className="px-2 py-1 font-medium">Phone</th>
              <th className="px-2 py-1 font-medium">Name</th>
              <th className="px-2 py-1 font-medium">Role</th>
              <th className="px-2 py-1 font-medium">Groups / Accounts</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.jid + (c.groupName ?? "")} className="border-t border-line">
                <td className="px-2 py-1"><PhoneCell phone={c.phone} /></td>
                <td className="max-w-[160px] truncate px-2 py-1">{c.name || <span className="text-dim">—</span>}</td>
                <td className="px-2 py-1 text-muted">{c.admin ?? "—"}</td>
                <td className="max-w-[220px] truncate px-2 py-1 text-muted">
                  {(c.groups ?? (c.groupName ? [c.groupName] : [])).join(", ") || (c.sources ?? (c.sessionId ? [c.sessionId] : [])).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactScraper() {
  const pushToast = useGateway((s) => s.pushToast);
  const activeAccountId = useGateway((s) => s.activeAccountId);
  const [selected, setSelected] = useState<string[]>(activeAccountId ? [activeAccountId] : []);
  const [dedupe, setDedupe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapedContact[] | null>(null);

  const run = async () => {
    if (selected.length === 0) return pushToast("error", "Pick at least one account");
    setLoading(true);
    setResult(null);
    try {
      const r = await scrapeContacts(selected, { dedupe });
      if (!r.success || !r.data) return pushToast("error", r.message || "Scrape failed");
      setResult(r.data.contacts);
      pushToast("success", `Scraped ${r.data.total} contacts from ${r.data.accounts.length} account(s)`);
    } catch {
      pushToast("error", "Gateway unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Contact Scraper" sub="Pull the saved contacts from one or more connected accounts.">
      <AccountPicker
        selected={selected}
        onToggle={(id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
        onAll={(on) => {
          const conn = useGateway.getState().sessions.filter((s) => s.status === "connected").map((s) => s.sessionId);
          setSelected(on ? conn : []);
        }}
      />
      <label className="mt-2 flex items-center gap-2 text-[12px] text-muted">
        <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="accent-wa" />
        Merge duplicates across accounts
      </label>
      <button
        type="button"
        disabled={loading || selected.length === 0}
        onClick={() => void run()}
        className="mt-3 rounded-xl bg-indigo px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Scraping…" : "Scrape contacts"}
      </button>
      {result ? <ResultTable contacts={result} filename="contacts.csv" /> : null}
    </Section>
  );
}

function GroupScraper() {
  const pushToast = useGateway((s) => s.pushToast);
  const sessions = useGateway((s) => s.sessions);
  const activeAccountId = useGateway((s) => s.activeAccountId);
  const connected = sessions.filter((s) => s.status === "connected");
  const [sessionId, setSessionId] = useState(() => (connected.find((s) => s.sessionId === activeAccountId) ?? connected[0])?.sessionId ?? "");
  const [scope, setScope] = useState<"all" | "pick">("all");
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapedContact[] | null>(null);

  // Load the account's groups when "choose groups" is selected.
  useEffect(() => {
    if (scope !== "pick" || !sessionId) return;
    let cancelled = false;
    setGroupsLoading(true);
    listGroups(sessionId)
      .then((r) => {
        if (!cancelled) setGroups(r.success && r.data ? r.data.groups : []);
      })
      .catch(() => !cancelled && setGroups([]))
      .finally(() => !cancelled && setGroupsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope, sessionId]);

  useEffect(() => {
    setPicked([]);
    setResult(null);
  }, [sessionId]);

  const run = async () => {
    if (!sessionId) return pushToast("error", "Pick a connected account");
    if (scope === "pick" && picked.length === 0) return pushToast("error", "Pick at least one group");
    setLoading(true);
    setResult(null);
    try {
      const r = await scrapeGroups([sessionId], scope === "all" ? null : picked, { dedupe: true });
      if (!r.success || !r.data) return pushToast("error", r.message || "Scrape failed");
      setResult(r.data.contacts);
      const errs = r.data.accounts.filter((a) => a.error).map((a) => a.error);
      if (r.data.total === 0 && errs.length) {
        pushToast("error", errs[0] ?? "No members returned");
      } else {
        pushToast(
          "success",
          `Scraped ${r.data.total} member(s) from ${r.data.groups.length} group(s)${errs.length ? ` (${errs.length} group error(s))` : ""}`,
        );
      }
    } catch {
      pushToast("error", "Gateway unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Group Scraper" sub="Pull members from all groups on an account, or just the groups you choose. Phone numbers come from WhatsApp; members who hide theirs show as Hidden.">
      <label className={label}>
        Account
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className={cn(field, "mt-1")}>
          {connected.length === 0 ? <option value="">No connected account</option> : null}
          {connected.map((s) => (
            <option key={s.sessionId} value={s.sessionId}>
              {s.name || s.sessionId}
              {s.phoneNumber ? ` · ${s.phoneNumber}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-2 flex gap-1 rounded-xl border border-line bg-night/30 p-1 text-[12px]">
        {(["all", "pick"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setScope(v)}
            className={cn("flex-1 rounded-lg py-1.5", scope === v ? "bg-indigo/30 text-indigo" : "text-muted")}
          >
            {v === "all" ? "All groups" : "Choose groups"}
          </button>
        ))}
      </div>

      {scope === "pick" ? (
        <div className="scroll-thin mt-2 max-h-40 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1">
          {groupsLoading ? (
            <>
              <div className="wa-loadbar mx-2 my-1" />
              <p className="p-3 text-center text-xs text-muted">Loading groups…</p>
            </>
          ) : groups.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted">No groups on this account.</p>
          ) : (
            groups.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={picked.includes(g.id)}
                  onChange={() => setPicked((p) => (p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]))}
                  className="accent-wa"
                />
                <span className="min-w-0 flex-1 truncate">{g.name || g.id}</span>
                <span className="shrink-0 text-[10px] text-dim">{g.participantsCount ?? "?"}</span>
              </label>
            ))
          )}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading || !sessionId}
        onClick={() => void run()}
        className="mt-3 rounded-xl bg-indigo px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Scraping…" : scope === "all" ? "Scrape all groups" : `Scrape ${picked.length || ""} group(s)`}
      </button>
      {result ? <ResultTable contacts={result} filename="group-members.csv" /> : null}
    </Section>
  );
}

function AddToGroup() {
  const pushToast = useGateway((s) => s.pushToast);
  const sessions = useGateway((s) => s.sessions);
  const activeAccountId = useGateway((s) => s.activeAccountId);
  const connected = sessions.filter((s) => s.status === "connected");
  const [selected, setSelected] = useState<string[]>(() => {
    const initial = connected.find((s) => s.sessionId === activeAccountId) ?? connected[0];
    return initial ? [initial.sessionId] : [];
  });
  const [membersPerAccount, setMembersPerAccount] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupId, setGroupId] = useState("");
  const [invite, setInvite] = useState("");
  const [invitePreview, setInvitePreview] = useState<{ groupId: string; name?: string; participantCount?: number } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [numbers, setNumbers] = useState("");
  const [name, setName] = useState("");
  const [namesByPhone, setNamesByPhone] = useState<Record<string, string>>({});
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const csvInput = useRef<HTMLInputElement>(null);
  const [delayMs, setDelayMs] = useState("3000");
  const [jitterMs, setJitterMs] = useState("2000");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<AddProgressRow[]>([]);
  const [runPlanned, setRunPlanned] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const lookupSession = selected[0] || connected[0]?.sessionId || "";
  const parsed = useMemo(() => parseRecipients(numbers), [numbers]);
  const inviteTarget = useMemo(() => parseGroupTarget(invite), [invite]);
  const allOn = connected.length > 0 && connected.every((s) => selected.includes(s.sessionId));

  useEffect(() => {
    const live = sessions.filter((s) => s.status === "connected").map((s) => s.sessionId);
    const ids = new Set(live);
    setSelected((prev) => {
      const keep = prev.filter((id) => ids.has(id));
      if (keep.length === prev.length && prev.length > 0) return prev;
      if (keep.length) return keep;
      if (prev.length === 0 && live.length) {
        const fallback = live.includes(activeAccountId) ? activeAccountId : live[0]!;
        return [fallback];
      }
      return keep;
    });
  }, [sessions, activeAccountId]);

  const parsedShared = membersPerAccount.trim() === "" ? null : Math.max(0, Number(membersPerAccount) || 0);
  const parsedOverrides = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const id of selected) {
      const raw = overrides[id]?.trim() ?? "";
      out[id] = raw === "" ? null : Math.max(0, Number(raw) || 0);
    }
    return out;
  }, [overrides, selected]);

  const quotas = useMemo(
    () =>
      resolveQuotas({
        sessionIds: selected,
        membersPerAccount: parsedShared,
        overrides: parsedOverrides,
        phoneCount: parsed.valid.length,
      }),
    [selected, parsedShared, parsedOverrides, parsed.valid.length],
  );
  const plan = useMemo(() => allocateMembers(parsed.valid, quotas), [parsed.valid, quotas]);
  const progress = useMemo(
    () => addProgressStats(log, busy || log.length ? runPlanned || plan.planned : plan.planned),
    [log, busy, runPlanned, plan.planned],
  );

  useEffect(() => {
    if (!lookupSession) {
      setGroups([]);
      setGroupId("");
      return;
    }
    let cancelled = false;
    listGroups(lookupSession)
      .then((r) => {
        if (cancelled) return;
        const gs = r.success && r.data ? r.data.groups : [];
        setGroups(gs);
        setGroupId((cur) => (gs.some((g) => g.id === cur) ? cur : gs[0]?.id ?? ""));
      })
      .catch(() => !cancelled && setGroups([]));
    return () => {
      cancelled = true;
    };
  }, [lookupSession]);

  useEffect(() => {
    if (inviteTarget.kind !== "invite" || !lookupSession) {
      setInvitePreview(null);
      setLookingUp(false);
      const looksFinished = /chat\.whatsapp\.com\/[A-Za-z0-9_-]{16,}/i.test(invite);
      setInviteError(looksFinished && inviteTarget.kind === "none" ? "Not a valid chat.whatsapp.com invite." : null);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    setInviteError(null);
    const timer = setTimeout(() => {
      resolveGroupTarget(lookupSession, inviteTarget, liveAddToGroupApis)
        .then((info) => {
          if (cancelled) return;
          setInvitePreview(info);
          setInviteError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setInvitePreview(null);
          setInviteError(err instanceof Error ? err.message : "Could not look up that invite.");
        })
        .finally(() => {
          if (!cancelled) setLookingUp(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inviteTarget, lookupSession, invite]);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selectAll = (on: boolean) => setSelected(on ? connected.map((s) => s.sessionId) : []);

  const applyCsv = async (file: File) => {
    const text = await file.text();
    const csv = parseScraperContactsCsv(text);
    if (csv.phones.length === 0) {
      pushToast("error", csv.skipped ? "CSV had no dialable numbers (hidden members are skipped)." : "Could not read that CSV. Use the Group Scraper export.");
      return;
    }
    setNumbers((prev) => {
      const have = new Set(parseRecipients(prev).valid);
      const merged = [...parseRecipients(prev).valid];
      for (const phone of csv.phones) {
        if (!have.has(phone)) merged.push(phone);
      }
      return merged.join("\n");
    });
    setNamesByPhone((prev) => ({ ...prev, ...csv.names }));
    setCsvName(file.name);
    setCsvSkipped(csv.skipped);
    pushToast("success", `Loaded ${csv.phones.length} user${csv.phones.length === 1 ? "" : "s"} from CSV${csv.skipped ? ` · ${csv.skipped} skipped` : ""}`);
  };

  const run = async () => {
    if (selected.length === 0) return pushToast("error", "Pick at least one account");
    if (parsed.valid.length === 0) return pushToast("error", "Add at least one valid number");
    if (plan.planned === 0) return pushToast("error", "Set how many members each account should add");
    setBusy(true);
    setLog([]);
    setRunPlanned(plan.planned);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let resolvedId = groupId;
      let resolvedName = groups.find((g) => g.id === groupId)?.name;
      if (inviteTarget.kind === "invite") {
        const info = invitePreview ?? (await resolveGroupTarget(lookupSession, inviteTarget, liveAddToGroupApis));
        resolvedId = info.groupId;
        resolvedName = info.name ?? resolvedName;
      } else if (inviteTarget.kind === "jid") {
        resolvedId = inviteTarget.groupId;
      }
      if (!resolvedId) return pushToast("error", "Pick a group or paste a valid invite link");
      const result = await addAssignedPhones({
        groupId: resolvedId,
        assignments: plan.assignments,
        name: name.trim() || undefined,
        namesByPhone,
        delayMs: Math.max(0, Number(delayMs) || 0),
        jitterMs: Math.max(0, Number(jitterMs) || 0),
        signal: ac.signal,
        onRow: (row) => setLog((prev) => [...prev.filter((x) => !(x.phone === row.phone && x.sessionId === row.sessionId)), row]),
        apis: liveAddToGroupApis,
      });
      const label = resolvedName ? `${resolvedName}` : "group";
      pushToast(
        result.added > 0 ? "success" : "error",
        `Added ${result.added}/${plan.planned} to ${label}${result.failed ? ` · ${result.failed} failed` : ""}${plan.leftover.length ? ` · ${plan.leftover.length} not assigned` : ""}`,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") pushToast("info", "Stopped");
      else pushToast("error", err instanceof Error ? err.message : "Gateway unreachable");
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  return (
    <Section
      title="Add Contacts to a Group"
      sub="Save each number to the account's address book, add it to the group, then remove it from the address book. Pace the work so WhatsApp does not throttle the accounts."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={label}>Group</span>
              {lookingUp ? <span className="text-[11px] text-muted">Looking up invite…</span> : null}
            </div>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="https://chat.whatsapp.com/… or leave blank and pick below"
              autoComplete="off"
              spellCheck={false}
              className={cn(field, "font-mono text-xs")}
            />
            {invitePreview ? (
              <p className="mt-1.5 rounded-xl border border-wa/30 bg-wa/10 px-3 py-2 text-[12px] text-wa">
                <span className="font-semibold">{invitePreview.name || "Group"}</span>
                {invitePreview.participantCount != null ? ` · ${invitePreview.participantCount} members` : ""}
                <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">{invitePreview.groupId}</span>
              </p>
            ) : null}
            {inviteError ? <p className="mt-1 text-[11px] text-danger">{inviteError}</p> : null}
            {inviteTarget.kind === "invite" && !lookupSession ? (
              <p className="mt-1 text-[11px] text-muted">Connect an account to preview this group from the invite.</p>
            ) : null}
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={inviteTarget.kind === "invite" || inviteTarget.kind === "jid"}
              className={cn(field, "mt-2")}
            >
              {groups.length === 0 ? <option value="">No groups on this account</option> : null}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name || g.id}
                  {g.participantsCount != null ? ` · ${g.participantsCount}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-dim">
              Invite links work with query flags (for example <span className="font-mono">?s=cl&p=a</span>). The dropdown is used when no link is pasted.
            </p>
          </div>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className={label}>Phone numbers</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-night/40 px-2.5 py-0.5 text-[11px] font-medium text-ink">
                  {parsed.valid.length} user{parsed.valid.length === 1 ? "" : "s"} in this list
                </span>
                <input
                  ref={csvInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void applyCsv(file).catch(() => pushToast("error", "Could not read that file"));
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => csvInput.current?.click()}
                  className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink disabled:opacity-50"
                >
                  Upload CSV
                </button>
              </div>
            </div>
            <textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              rows={7}
              placeholder={"One per line\n628123456789\n628987654321"}
              className={cn(field, "font-mono text-xs")}
            />
            <p className="mt-1 text-[11px] text-dim">
              Paste numbers, or upload a CSV in the Group Scraper export format
              (<span className="font-mono">phone, name, jid, groups, sources</span>).
              {csvName ? (
                <span className="text-muted">
                  {" "}
                  Loaded {csvName}
                  {csvSkipped ? ` · ${csvSkipped} hidden/invalid skipped` : ""}.
                </span>
              ) : null}
            </p>
          </div>
          <p className="text-[11px] text-muted">
            {parsed.valid.length} valid
            {parsed.invalid.length ? <span className="text-danger"> · {parsed.invalid.length} ignored</span> : null}
            {plan.leftover.length ? <span> · {plan.leftover.length} not assigned to an account</span> : null}
            {" · only group admins can add members."}
          </p>
          <label className={label}>
            Contact name <span className="normal-case tracking-normal text-dim">(optional fallback — CSV names win)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead" className={cn(field, "mt-1")} />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={label}>Accounts</span>
              <button
                type="button"
                disabled={connected.length === 0}
                onClick={() => selectAll(!allOn)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  allOn ? "border-wa/40 bg-wa/15 text-wa" : "border-line text-muted hover:text-ink",
                )}
              >
                All accounts
              </button>
            </div>
            {connected.length === 0 ? (
              <p className="mt-1 rounded-xl border border-line bg-night/30 px-3 py-2 text-[11px] text-danger">No connected account.</p>
            ) : (
              <div className="scroll-thin mt-1 max-h-48 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1">
                {connected.map((s) => {
                  const on = selected.includes(s.sessionId);
                  const quota = quotas.find((q) => q.sessionId === s.sessionId)?.count ?? 0;
                  return (
                    <label key={s.sessionId} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                      <input type="checkbox" checked={on} onChange={() => toggle(s.sessionId)} className="accent-wa" />
                      <span className="min-w-0 flex-1 truncate">
                        {sessionDisplayName(s)}
                        {s.phoneNumber ? <span className="text-dim"> · {s.phoneNumber}</span> : null}
                      </span>
                      <input
                        type="number"
                        min={0}
                        disabled={!on || busy}
                        value={on ? (overrides[s.sessionId] ?? "") : ""}
                        placeholder={on ? String(quota) : "—"}
                        onChange={(e) => setOverrides((p) => ({ ...p, [s.sessionId]: e.target.value }))}
                        className="w-16 shrink-0 rounded-lg border border-line bg-night/50 px-1.5 py-1 text-center text-[11px] outline-none"
                        title="Members this account will add"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className={label}>
            Members per account
            <input
              type="number"
              min={0}
              value={membersPerAccount}
              onChange={(e) => setMembersPerAccount(e.target.value)}
              placeholder="Even split"
              className={cn(field, "mt-1")}
            />
            <span className="mt-1 block normal-case tracking-normal text-[11px] font-normal text-dim">
              Leave empty to split the list evenly. Per-account boxes on the right override this.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className={label}>
              Delay (ms)
              <input type="number" min={0} value={delayMs} onChange={(e) => setDelayMs(e.target.value)} className={cn(field, "mt-1")} />
            </label>
            <label className={label}>
              Jitter (ms)
              <input type="number" min={0} value={jitterMs} onChange={(e) => setJitterMs(e.target.value)} className={cn(field, "mt-1")} />
            </label>
          </div>
          <p className="text-[11px] text-dim">Waits delay + a random 0–jitter between each number.</p>

          <div className="rounded-xl border border-line bg-night/30 px-3 py-2 text-[12px] text-muted">
            <div className="font-medium text-ink">
              {plan.planned} member{plan.planned === 1 ? "" : "s"} across {plan.assignments.length || selected.length} account
              {plan.assignments.length === 1 ? "" : "s"}
            </div>
            {plan.assignments.map((a) => {
              const sess = connected.find((s) => s.sessionId === a.sessionId);
              return (
                <div key={a.sessionId} className="mt-0.5 truncate">
                  {sess ? sessionDisplayName(sess) : a.sessionId}: {a.phones.length}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-night/30 p-3">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="font-medium text-ink">{busy ? "Live progress" : log.length ? "Last run" : "Ready"}</span>
          <span className="tabular-nums text-muted">{progress.percent}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full bg-gradient-to-r from-indigo to-wa transition-[width] duration-300", busy && progress.percent < 100 ? "animate-pulse" : "")}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
          <div>
            <div className="text-sm font-semibold tabular-nums text-wa">{progress.added}</div>
            added
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums text-ink">{progress.remaining}</div>
            remaining
          </div>
          <div>
            <div className="text-sm font-semibold tabular-nums text-ink">
              {progress.processed}/{progress.planned || plan.planned}
            </div>
            complete
          </div>
        </div>
        {progress.failed > 0 ? <p className="mt-1 text-center text-[11px] text-danger">{progress.failed} failed</p> : null}
        {progress.current ? (
          <p className="mt-1 truncate text-center font-mono text-[11px] text-dim">
            {progress.current.phone} · {progress.current.message}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || selected.length === 0 || plan.planned === 0}
          onClick={() => void run()}
          className="rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
        >
          {busy ? "Working…" : `Save, add & clean ${plan.planned || ""}`}
        </button>
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-ink"
          >
            Stop
          </button>
        ) : null}
      </div>

      {log.length ? (
        <div className="scroll-thin mt-3 max-h-56 space-y-1 overflow-auto rounded-xl border border-line p-1 text-[11.5px]">
          {log.map((l) => (
            <div key={`${l.sessionId}:${l.phone}`} className="flex items-center gap-2 px-2 py-1">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  l.step === "done" ? "bg-wa" : l.step === "error" ? "bg-danger" : "bg-indigo animate-pulse",
                )}
              />
              <span className="font-mono">{l.phone}</span>
              <span className={cn("truncate", l.step === "error" ? "text-danger" : "text-muted")}>{l.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

export function ScrapersPanel() {
  return (
    <div className="glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4">
      <h2 className="mb-1 text-base font-semibold">Scrapers &amp; Contacts</h2>
      <p className="mb-4 text-[12px] text-muted">Export contacts, pull group members, and add saved contacts into groups.</p>
      <div className="grid gap-4 xl:grid-cols-2">
        <ContactScraper />
        <GroupScraper />
        <div className="xl:col-span-2">
          <AddToGroup />
        </div>
      </div>
    </div>
  );
}
