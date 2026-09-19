import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { MessageTemplate, TemplatePayload } from "@/lib/openwa-api";
import { copyToClipboard } from "@/lib/openwa/clipboard";
import { useAppToast } from "@/lib/openwa/useToast";
import { useCreateTemplateMutation, useDeleteTemplateMutation, useSessionsQuery, useTemplatesQuery, useUpdateTemplateMutation } from "@/lib/openwa-query";
import { useGateway } from "@/store/gateway-store";
import { btn, Card, ErrorLine, field, ghost } from "./ui";
import { cn } from "@/lib/cn";

type TemplateForm = { name: string; header: string; body: string; footer: string };
const emptyForm: TemplateForm = { name: "", header: "", body: "", footer: "" };

function extractPlaceholders(template: TemplateForm | MessageTemplate) {
  const source = [template.header, template.body, template.footer].filter(Boolean).join("\n");
  return Array.from(new Set(Array.from(source.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), (m) => m[1]))).sort();
}

function toPayload(form: TemplateForm): TemplatePayload {
  return { name: form.name.trim(), header: form.header.trim() || null, body: form.body.trim(), footer: form.footer.trim() || null };
}

function renderPreview(template: TemplateForm, values: Record<string, string>) {
  return [template.header, template.body, template.footer]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => values[key] || `{{${key}}}`);
}

export function TemplatesPanel() {
  const toast = useAppToast();
  const apply = useGateway((s) => s.applyTemplate);
  const sessions = useSessionsQuery();
  const [sessionId, setSessionId] = useState("");
  const sid = sessionId || sessions.data?.[0]?.id || "";
  const query = useTemplatesQuery(sid, Boolean(sid));
  const create = useCreateTemplateMutation();
  const update = useUpdateTemplateMutation();
  const remove = useDeleteTemplateMutation();
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const placeholders = useMemo(() => extractPlaceholders(form), [form]);
  const preview = useMemo(() => renderPreview(form, previewValues), [form, previewValues]);
  const filtered = (query.data ?? []).filter((t) =>
    [t.name, t.header, t.body, t.footer].filter(Boolean).some((v) => v!.toLowerCase().includes(search.toLowerCase())),
  );

  const save = async () => {
    if (!sid || !form.name.trim() || !form.body.trim()) return;
    try {
      if (editing) {
        await update.mutateAsync({ sessionId: sid, id: editing.id, dto: toPayload(form) });
        toast.success("Template updated");
      } else {
        await create.mutateAsync({ sessionId: sid, dto: toPayload(form) });
        toast.success("Template created");
      }
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "");
    }
  };

  if (!sid) return <p className="text-sm text-muted">Create a session first.</p>;

  return (
    <div className="space-y-3">
      <ErrorLine error={query.error} />
      <select className={field} value={sid} onChange={(e) => setSessionId(e.target.value)}>
        {(sessions.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Card title={editing ? `Edit ${editing.name}` : "New template"} sub="Use {{name}} placeholders in header, body, or footer.">
        <input className={cn(field, "mb-2")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
        <input className={cn(field, "mb-2")} value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })} placeholder="Header (optional)" />
        <textarea className={cn(field, "mb-2 min-h-24")} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Body" />
        <input className={cn(field, "mb-2")} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} placeholder="Footer (optional)" />
        {placeholders.length > 0 ? (
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            {placeholders.map((key) => (
              <input key={key} className={field} value={previewValues[key] ?? ""} onChange={(e) => setPreviewValues({ ...previewValues, [key]: e.target.value })} placeholder={`{{${key}}}`} />
            ))}
          </div>
        ) : null}
        {preview ? <pre className="mb-2 whitespace-pre-wrap rounded-xl border border-line bg-night/40 p-3 text-xs text-muted">{preview}</pre> : null}
        <div className="flex gap-2">
          <button type="button" className={btn} disabled={!form.name || !form.body || create.isPending || update.isPending} onClick={() => void save()}>
            <Plus size={12} /> {editing ? "Update" : "Save template"}
          </button>
          {editing ? (
            <button type="button" className={ghost} onClick={() => { setEditing(null); setForm(emptyForm); }}>
              Cancel
            </button>
          ) : null}
        </div>
      </Card>
      <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates" />
      {query.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {filtered.map((t) => (
        <Card key={t.id} title={t.name} sub={[t.header, t.body, t.footer].filter(Boolean).join(" · ")}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => apply([t.header, t.body, t.footer].filter(Boolean).join("\n\n"))}>
              Use in composer
            </button>
            <button type="button" className={ghost} onClick={() => void copyToClipboard(t.body)}>
              Copy body
            </button>
            <button type="button" className={ghost} onClick={() => { setEditing(t); setForm({ name: t.name, header: t.header || "", body: t.body, footer: t.footer || "" }); }}>
              Edit
            </button>
            <button type="button" className={ghost} onClick={() => remove.mutate({ sessionId: sid, id: t.id })}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
