import { useState } from "react";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { testWebhook, type OpenWAWebhook, type WebhookFilters } from "@/lib/openwa-api";
import { AKG_WEBHOOK_EVENTS } from "@/lib/openwa/akg-api";
import { WebhookDeliveries } from "../akg/WebhookDeliveries";
import { useAppToast } from "@/lib/openwa/useToast";
import {
  useChatsQuery,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useSessionsQuery,
  useUpdateWebhookMutation,
  useWebhooksQuery,
} from "@/lib/openwa-query";
import { btn, Card, ErrorLine, field, ghost, Modal } from "./ui";
import { FilterBuilder } from "./FilterBuilder";

const EVENT_NAMES = [
  "message.received",
  "message.sent",
  "message.ack",
  "message.failed",
  "message.revoked",
  "message.reaction",
  "message.edited",
  "session.status",
  "session.qr",
  "session.authenticated",
  "session.disconnected",
  "session.reconnect_loop",
  "session.restriction",
  "presence.update",
  "group.join",
  "group.leave",
  "group.update",
  "group.join_request",
  "call.received",
  "call.accepted",
  "call.rejected",
  "call.missed",
  "status.received",
  "*",
  ...AKG_WEBHOOK_EVENTS,
] as const;

const supportsFilters = (events: string[]) => events.some((e) => e === "*" || e.startsWith("message."));

export function WebhooksPanel() {
  const toast = useAppToast();
  const sessions = useSessionsQuery();
  const webhooks = useWebhooksQuery();
  const create = useCreateWebhookMutation();
  const update = useUpdateWebhookMutation();
  const remove = useDeleteWebhookMutation();
  const [form, setForm] = useState<{ url: string; events: string[]; sessionId: string; filters: WebhookFilters | null }>({
    url: "",
    events: ["message.received"],
    sessionId: "",
    filters: null,
  });
  const [edit, setEdit] = useState<OpenWAWebhook | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const sid = form.sessionId || sessions.data?.[0]?.id || "";
  const chats = useChatsQuery(edit?.sessionId || sid, Boolean(edit || sid));

  const toggleEvent = (name: string, list: string[], set: (next: string[]) => void) => {
    set(list.includes(name) ? list.filter((e) => e !== name) : [...list, name]);
  };

  return (
    <div className="space-y-3">
      <ErrorLine error={webhooks.error} />
      <Card title="Register webhook" sub="Deliver OpenWA events to an HTTPS endpoint.">
        <div className="grid gap-2">
          <select className={field} value={sid} onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}>
            {(sessions.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input className={field} value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com/hook" />
          <div className="flex flex-wrap gap-1">
            {EVENT_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className={form.events.includes(name) ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px] text-muted"}
                onClick={() => toggleEvent(name, form.events, (events) => setForm((f) => ({ ...f, events })))}
              >
                {name}
              </button>
            ))}
          </div>
          {supportsFilters(form.events) ? <FilterBuilder filters={form.filters} onChange={(filters) => setForm((f) => ({ ...f, filters }))} chats={chats.data ?? []} /> : null}
          <button
            type="button"
            className={btn}
            disabled={!sid || !form.url || form.events.length === 0 || create.isPending}
            onClick={() =>
              create
                .mutateAsync({ sessionId: sid, url: form.url, events: form.events, filters: form.filters })
                .then(() => toast.success("Webhook created"))
                .catch((err: unknown) => toast.error("Create failed", err instanceof Error ? err.message : ""))
            }
          >
            <Plus size={12} /> {create.isPending ? "Saving…" : "Create"}
          </button>
        </div>
      </Card>
      {webhooks.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {(webhooks.data ?? []).map((hook) => (
        <Card key={hook.id} title={hook.url} sub={`${hook.sessionId} · ${hook.active ? "active" : "paused"} · ${(hook.events ?? []).join(", ")}`}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ghost}
              disabled={testingId === hook.id}
              onClick={async () => {
                setTestingId(hook.id);
                try {
                  const res = await testWebhook(hook.sessionId, hook.id);
                  toast.success(res.success ? "Test delivered" : "Test failed", res.error || String(res.statusCode ?? ""));
                } catch (err) {
                  toast.error("Test failed", err instanceof Error ? err.message : "");
                } finally {
                  setTestingId(null);
                }
              }}
            >
              <Play size={12} /> Test
            </button>
            <button type="button" className={ghost} onClick={() => setEdit(hook)}>
              Edit
            </button>
            <button type="button" className={ghost} onClick={() => remove.mutate({ id: hook.id, sessionId: hook.sessionId })}>
              <Trash2 size={12} /> Delete
            </button>
            <WebhookDeliveries sessionId={hook.sessionId} webhookId={hook.id} />
          </div>
        </Card>
      ))}
      <Modal open={Boolean(edit)} title="Edit webhook" onClose={() => setEdit(null)} wide>
        {edit ? (
          <div className="space-y-2">
            <input className={field} value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} />
            <div className="flex flex-wrap gap-1">
              {EVENT_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={(edit.events ?? []).includes(name) ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px] text-muted"}
                  onClick={() => toggleEvent(name, edit.events ?? [], (events) => setEdit({ ...edit, events }))}
                >
                  {name}
                </button>
              ))}
            </div>
            {supportsFilters(edit.events ?? []) ? <FilterBuilder filters={edit.filters} onChange={(filters) => setEdit({ ...edit, filters })} chats={chats.data ?? []} /> : null}
            <button
              type="button"
              className={btn}
              disabled={update.isPending}
              onClick={() =>
                update
                  .mutateAsync({ id: edit.id, dto: { sessionId: edit.sessionId, url: edit.url, events: edit.events, filters: edit.filters, active: edit.active } })
                  .then(() => {
                    toast.success("Webhook updated");
                    setEdit(null);
                  })
                  .catch((err: unknown) => toast.error("Update failed", err instanceof Error ? err.message : ""))
              }
            >
              Save
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
