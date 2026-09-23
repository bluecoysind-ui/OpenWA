import { useState } from "react";
import { Loader2, Play, Plus, QrCode, Skull, Square, Trash2, Unlink } from "lucide-react";
import { canForceKillSession, canUnlinkSession, classifyUnlinkError, isSessionStarted } from "@/lib/openwa/sessionActions";
import { canCreateSession, filterSessions, isValidProxyUrl, sessionNameIssues } from "@/lib/openwa/sessionForm";
import { useAppToast } from "@/lib/openwa/useToast";
import {
  useCreateSessionMutation,
  useDeleteSessionMutation,
  useForceKillSessionMutation,
  useLogoutSessionMutation,
  useSessionConfigQuery,
  useSessionProxyQuery,
  useSessionsQuery,
  useStartSessionMutation,
  useStopSessionMutation,
  useUpdateSessionConfigMutation,
  useUpdateSessionProxyMutation,
} from "@/lib/openwa-query";
import { useGateway } from "@/store/gateway-store";
import { restrictionTooltip } from "@/lib/openwa/restrictionLabel";
import { sessionDisplayName } from "@/lib/openwa/sessionLabel";
import { btn, Card, danger, ErrorLine, field, ghost, Modal, Toggle } from "./ui";

export function SessionsPanel() {
  const toast = useAppToast();
  const openOverlay = useGateway((s) => s.openOverlay);
  const refreshSessions = useGateway((s) => s.refreshSessions);
  const sessionsQ = useSessionsQuery();
  const start = useStartSessionMutation();
  const stop = useStopSessionMutation();
  const logout = useLogoutSessionMutation();
  const kill = useForceKillSessionMutation();
  const remove = useDeleteSessionMutation();
  const create = useCreateSessionMutation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [name, setName] = useState("");
  const [proxy, setProxy] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: "delete" | "kill" | "unlink"; id: string; name: string } | null>(null);
  const rows = filterSessions(sessionsQ.data ?? [], search, statusFilter);
  const issues = sessionNameIssues(name, (sessionsQ.data ?? []).map((s) => s.name));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      void refreshSessions();
    } catch (err) {
      toast.error("Action failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-3">
      <ErrorLine error={sessionsQ.error} />
      <Card
        title="Create session"
        sub="Letters, numbers, and hyphens. Optional proxy is used on first connect. Linked sessions auto-restart after API or socket gaps when WhatsApp auth is still valid."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="session-name" />
          <input className={field} value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="socks5://host:1080 (optional)" />
          <button
            type="button"
            className={btn}
            disabled={!canCreateSession(name, (sessionsQ.data ?? []).map((s) => s.name)) || create.isPending || (proxy.trim() !== "" && !isValidProxyUrl(proxy))}
            onClick={() =>
              void run(async () => {
                await create.mutateAsync({ name, proxyUrl: proxy.trim() || undefined });
                setName("");
                setProxy("");
              }, "Session created")
            }
          >
            <Plus size={14} /> Create
          </button>
        </div>
        {issues.filter((i) => i !== "empty").map((issue) => (
          <p key={issue} className="mt-2 text-[11px] text-danger">
            {issue === "format" ? "Use lowercase letters, numbers, and hyphens." : issue === "too-long" ? "Max 50 characters." : "Name already in use."}
          </p>
        ))}
      </Card>
      <div className="flex flex-wrap gap-2">
        <input className={`${field} min-w-0 flex-1`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions" />
        <select className={`${field} w-40`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Ready</option>
          <option value="connecting">Connecting</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {sessionsQ.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {rows.map((session) => (
        <div key={session.id} className="rounded-2xl border border-line bg-night/30 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{sessionDisplayName(session)}</div>
              <div className="text-[11px] text-muted">
                {session.pushName && session.name !== session.pushName ? `${session.name} · ` : ""}
                {session.status}
                {session.phone ? ` · ${session.phone}` : ""}
                {session.lastError ? ` · ${session.lastError}` : ""}
                {session.restriction ? (
                  <span title={restrictionTooltip(session.restriction)}> · {session.restriction.kind}</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {!isSessionStarted(session) ? (
                <button type="button" className={ghost} disabled={start.isPending} onClick={() => void run(() => start.mutateAsync(session.id), "Starting")}>
                  <Play size={12} /> Start
                </button>
              ) : (
                <button type="button" className={ghost} disabled={stop.isPending} onClick={() => void run(() => stop.mutateAsync(session.id), "Stopped")}>
                  <Square size={12} /> Stop
                </button>
              )}
              <button type="button" className={ghost} onClick={() => openOverlay("qr", session.id)}>
                <QrCode size={12} /> QR
              </button>
              {canUnlinkSession(session) ? (
                <button type="button" className={ghost} onClick={() => setConfirm({ type: "unlink", id: session.id, name: session.name })}>
                  <Unlink size={12} /> Unlink
                </button>
              ) : null}
              {canForceKillSession(session) ? (
                <button type="button" className={danger} onClick={() => setConfirm({ type: "kill", id: session.id, name: session.name })}>
                  <Skull size={12} /> Kill
                </button>
              ) : null}
              <button type="button" className={ghost} onClick={() => setDetailId(session.id)}>
                Config
              </button>
              <button type="button" className={danger} onClick={() => setConfirm({ type: "delete", id: session.id, name: session.name })}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {detailId ? <SessionDetail id={detailId} onClose={() => setDetailId(null)} /> : null}
      <Modal open={Boolean(confirm)} title={confirm?.type === "delete" ? "Delete session" : confirm?.type === "kill" ? "Force kill" : "Unlink WhatsApp"} onClose={() => setConfirm(null)}>
        <p className="mb-4 text-sm text-muted">
          {confirm?.type === "delete"
            ? `Delete ${confirm.name}? This cannot be undone.`
            : confirm?.type === "kill"
              ? `Force-kill the engine for ${confirm.name}?`
              : `Logout ${confirm?.name} from WhatsApp? You will need to scan QR again.`}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={ghost} onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            type="button"
            className={danger}
            onClick={() => {
              if (!confirm) return;
              void run(async () => {
                if (confirm.type === "delete") await remove.mutateAsync(confirm.id);
                else if (confirm.type === "kill") await kill.mutateAsync(confirm.id);
                else {
                  try {
                    await logout.mutateAsync(confirm.id);
                  } catch (err) {
                    if (classifyUnlinkError(err) === "incomplete") {
                      toast.warning("Unlink incomplete", "The session stopped locally. Start it and retry logout.");
                      return;
                    }
                    throw err;
                  }
                }
              }, "Done");
              setConfirm(null);
            }}
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useAppToast();
  const configQ = useSessionConfigQuery(id, true);
  const proxyQ = useSessionProxyQuery(id, true);
  const saveConfig = useUpdateSessionConfigMutation();
  const saveProxy = useUpdateSessionProxyMutation();
  const [proxyUrl, setProxyUrl] = useState("");
  const [reject, setReject] = useState<boolean | null>(null);
  const autoReject = reject ?? configQ.data?.autoRejectCalls ?? false;

  return (
    <Modal open title="Session settings" onClose={onClose} wide>
      <ErrorLine error={configQ.error ?? proxyQ.error} />
      {configQ.isLoading || proxyQ.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm">Auto-reject calls</div>
          <div className="text-[11px] text-muted">Decline incoming WhatsApp calls</div>
        </div>
        <Toggle checked={autoReject} onChange={setReject} />
      </div>
      <button
        type="button"
        className={`${btn} mb-4`}
        disabled={saveConfig.isPending}
        onClick={() =>
          void saveConfig
            .mutateAsync({ id, patch: { autoRejectCalls: autoReject } })
            .then(() => toast.success("Config saved"))
            .catch((err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : ""))
        }
      >
        Save config
      </button>
      <Card title="Proxy" sub={proxyQ.data?.enabled ? proxyQ.data.proxyHost ?? "Configured" : "Direct connection"}>
        {proxyQ.isError ? <p className="mb-2 text-sm text-danger">Could not load proxy — not shown so a save cannot wipe it.</p> : null}
        <input className={field} value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="socks5://user:pass@host:1080" />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={btn}
            disabled={saveProxy.isPending || !isValidProxyUrl(proxyUrl)}
            onClick={() =>
              void saveProxy
                .mutateAsync({ id, proxyUrl })
                .then(() => toast.success("Proxy saved"))
                .catch((err: unknown) => toast.error("Proxy failed", err instanceof Error ? err.message : ""))
            }
          >
            Save proxy
          </button>
          <button
            type="button"
            className={ghost}
            disabled={saveProxy.isPending || proxyQ.isError}
            onClick={() => void saveProxy.mutateAsync({ id, proxyUrl: null }).then(() => toast.success("Proxy removed"))}
          >
            Remove
          </button>
        </div>
      </Card>
    </Modal>
  );
}
