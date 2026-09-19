import { useState } from "react";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import type { ApiKey } from "@/lib/openwa-api";
import { copyToClipboard } from "@/lib/openwa/clipboard";
import { canScopeSessions, sameSessionScope, sessionScopeNames } from "@/lib/openwa/sessionScope";
import { useAppToast } from "@/lib/openwa/useToast";
import {
  useApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useRevokeApiKeyMutation,
  useSessionsQuery,
  useUpdateApiKeyMutation,
} from "@/lib/openwa-query";
import { btn, Card, danger, ErrorLine, field, ghost, Modal } from "./ui";

const emptyForm = { name: "", role: "operator", allowedSessions: [] as string[] };

export function ApiKeysPanel() {
  const toast = useAppToast();
  const keys = useApiKeysQuery();
  const sessions = useSessionsQuery();
  const create = useCreateApiKeyMutation();
  const update = useUpdateApiKeyMutation();
  const remove = useDeleteApiKeyMutation();
  const revoke = useRevokeApiKeyMutation();
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [editSessions, setEditSessions] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ type: "delete" | "revoke"; id: string; name: string } | null>(null);

  return (
    <div className="space-y-3">
      <ErrorLine error={keys.error} />
      {created ? (
        <Card title="Copy this key now" sub="OpenWA only shows the plaintext once.">
          <code className="mb-2 block break-all rounded-xl border border-line bg-night/40 p-3 text-xs">{created}</code>
          <button type="button" className={ghost} onClick={() => void copyToClipboard(created).then((ok) => ok && toast.success("Copied"))}>
            <Copy size={12} /> Copy
          </button>
        </Card>
      ) : null}
      <Card title="Create key">
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
          <select className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, allowedSessions: [] })}>
            <option value="admin">admin</option>
            <option value="operator">operator</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="button"
            className={btn}
            disabled={!form.name || create.isPending}
            onClick={async () => {
              try {
                const row = await create.mutateAsync({
                  name: form.name,
                  role: form.role,
                  ...(canScopeSessions(form.role) ? { allowedSessions: form.allowedSessions } : {}),
                });
                setCreated(row.apiKey);
                setForm(emptyForm);
              } catch (err) {
                toast.error("Create failed", err instanceof Error ? err.message : "");
              }
            }}
          >
            <Plus size={12} /> Create
          </button>
        </div>
        {canScopeSessions(form.role) ? (
          <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-line p-2">
            {(sessions.data ?? []).map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowedSessions.includes(s.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      allowedSessions: e.target.checked ? [...form.allowedSessions, s.id] : form.allowedSessions.filter((id) => id !== s.id),
                    })
                  }
                />
                {s.name}
              </label>
            ))}
            <p className="mt-1 text-[11px] text-muted">Empty allowlist = all current and future sessions.</p>
          </div>
        ) : null}
      </Card>
      {keys.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {(keys.data ?? []).map((k) => {
        const scope = sessionScopeNames(k.allowedSessions, sessions.data ?? []);
        return (
          <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-night/30 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound size={14} /> {k.name}
              </div>
              <div className="text-[11px] text-muted">
                {k.role} · {k.keyPrefix}… · {k.isActive ? "active" : "revoked"} · used {k.usageCount}
                {scope ? ` · ${scope.join(", ")}` : " · all sessions"}
              </div>
            </div>
            <div className="flex gap-1.5">
              {canScopeSessions(k.role) ? (
                <button
                  type="button"
                  className={ghost}
                  onClick={() => {
                    setEditing(k);
                    setEditSessions(k.allowedSessions ?? []);
                  }}
                >
                  Sessions
                </button>
              ) : null}
              {k.isActive ? (
                <button type="button" className={ghost} onClick={() => setConfirm({ type: "revoke", id: k.id, name: k.name })}>
                  Revoke
                </button>
              ) : null}
              <button type="button" className={danger} onClick={() => setConfirm({ type: "delete", id: k.id, name: k.name })}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
      <Modal open={Boolean(editing)} title="Session scope" onClose={() => setEditing(null)}>
        {(sessions.data ?? []).map((s) => (
          <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={editSessions.includes(s.id)}
              onChange={(e) => setEditSessions(e.target.checked ? [...editSessions, s.id] : editSessions.filter((id) => id !== s.id))}
            />
            {s.name}
          </label>
        ))}
        <button
          type="button"
          className={`${btn} mt-3`}
          disabled={update.isPending || !editing}
          onClick={async () => {
            if (!editing) return;
            if (sameSessionScope(editSessions, editing.allowedSessions ?? [])) {
              setEditing(null);
              return;
            }
            try {
              await update.mutateAsync({ id: editing.id, data: { allowedSessions: editSessions } });
              setEditing(null);
              toast.success("Scope updated");
            } catch (err) {
              toast.error("Update failed", err instanceof Error ? err.message : "");
            }
          }}
        >
          Save
        </button>
      </Modal>
      <Modal open={Boolean(confirm)} title={confirm?.type === "delete" ? "Delete key" : "Revoke key"} onClose={() => setConfirm(null)}>
        <p className="mb-4 text-sm text-muted">
          {confirm?.type === "delete" ? `Permanently delete ${confirm.name}?` : `Revoke ${confirm?.name}? It will stop working immediately.`}
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
              if (confirm.type === "delete") remove.mutate(confirm.id);
              else revoke.mutate(confirm.id);
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
