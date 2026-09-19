import { useId, useState } from "react";
import { Copy, Loader2, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import type { InstanceView, PluginConfigField } from "@/lib/openwa-api";
import { copyToClipboard } from "@/lib/openwa/clipboard";
import { coerceFieldInput, emptyForField } from "@/lib/openwa/pluginConfigForm";
import { isValidInstanceId, isValidInstanceSecret, parseInstanceConfig } from "@/lib/openwa/instanceForm";
import { useAppToast } from "@/lib/openwa/useToast";
import {
  useCreateInstanceMutation,
  useDeleteInstanceMutation,
  usePluginInstancesQuery,
  useRegenerateInstanceSecretMutation,
  useUpdateInstanceMutation,
} from "@/lib/openwa-query";
import { btn, Card, danger, ErrorLine, field, ghost, Modal } from "./ui";

const emptyForm = { instanceId: "", sessionScope: "", verifyToken: "", secret: "", config: "" };

export function PluginInstances({ pluginId }: { pluginId: string }) {
  const toast = useAppToast();
  const list = usePluginInstancesQuery(pluginId, true);
  const createM = useCreateInstanceMutation(pluginId);
  const regenM = useRegenerateInstanceSecretMutation(pluginId);
  const updateM = useUpdateInstanceMutation(pluginId);
  const deleteM = useDeleteInstanceMutation(pluginId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [minted, setMinted] = useState<InstanceView | null>(null);

  const submit = async () => {
    if (!isValidInstanceId(form.instanceId)) {
      setFormError("Instance id: 1–64 letters, numbers, _ or -");
      return;
    }
    const parsed = parseInstanceConfig(form.config);
    if (!parsed.ok) {
      setFormError("Config must be a JSON object");
      return;
    }
    if (!isValidInstanceSecret(form.secret)) {
      setFormError("Secret must be empty (auto) or at least 16 characters");
      return;
    }
    try {
      const created = await createM.mutateAsync({
        instanceId: form.instanceId,
        sessionScope: form.sessionScope.trim() || undefined,
        verifyToken: form.verifyToken.trim() || undefined,
        secret: form.secret.trim() || undefined,
        config: parsed.value,
      });
      setShowForm(false);
      setForm(emptyForm);
      setMinted(created);
      toast.success("Instance created", created.instanceId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    }
  };

  return (
    <div className="space-y-3">
      <ErrorLine error={list.error} />
      <button type="button" className={btn} onClick={() => { setShowForm(true); setFormError(null); }}>
        <Plus size={14} /> New instance
      </button>
      {list.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {(list.data ?? []).map((inst) => (
        <Card key={inst.id} title={inst.instanceId} sub={`${inst.enabled ? "enabled" : "disabled"} · ${inst.sessionScope || "all sessions"}`}>
          {inst.ingressUrls.map((u) => (
            <div key={u.route} className="mb-1 flex items-center gap-2 text-[11px] text-muted">
              <code className="truncate">{u.url}</code>
              <button type="button" className={ghost} onClick={() => void copyToClipboard(u.url)}>
                <Copy size={10} />
              </button>
            </div>
          ))}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" className={ghost} disabled={updateM.isPending} onClick={() => void updateM.mutateAsync({ instanceId: inst.instanceId, body: { enabled: !inst.enabled } })}>
              <Power size={12} /> {inst.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              className={ghost}
              onClick={() =>
                void regenM.mutateAsync(inst.instanceId).then((row) => {
                  setMinted(row);
                  toast.success("Secret regenerated");
                })
              }
            >
              <RefreshCw size={12} /> New secret
            </button>
            <button type="button" className={danger} onClick={() => { if (window.confirm(`Delete ${inst.instanceId}?`)) deleteM.mutate(inst.instanceId); }}>
              <Trash2 size={12} />
            </button>
          </div>
        </Card>
      ))}
      <Modal open={showForm} title="Provision instance" onClose={() => setShowForm(false)}>
        {formError ? <p className="mb-2 text-sm text-danger">{formError}</p> : null}
        <div className="grid gap-2">
          <input className={field} value={form.instanceId} onChange={(e) => setForm({ ...form, instanceId: e.target.value })} placeholder="instance-id" />
          <input className={field} value={form.sessionScope} onChange={(e) => setForm({ ...form, sessionScope: e.target.value })} placeholder="session id (optional)" />
          <input className={field} value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} placeholder="verify token (optional)" />
          <input className={field} value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="secret (blank = auto)" />
          <textarea className={`${field} min-h-20`} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} placeholder='config JSON (optional) e.g. {"foo":1}' />
          <button type="button" className={btn} disabled={createM.isPending} onClick={() => void submit()}>
            Create
          </button>
        </div>
      </Modal>
      <Modal open={Boolean(minted)} title="Copy secret now" onClose={() => setMinted(null)}>
        {minted ? (
          <div className="space-y-2">
            <code className="block break-all rounded-xl border border-line p-3 text-xs">{minted.secret}</code>
            <button type="button" className={ghost} onClick={() => void copyToClipboard(minted.secret)}>
              Copy secret
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export function ConfigField({
  fieldDef,
  label,
  value,
  onChange,
}: {
  fieldDef: PluginConfigField;
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const fieldId = useId();
  if (fieldDef.type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 py-1 text-sm">
        <span>{label}</span>
        <input type="checkbox" id={fieldId} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }
  if (fieldDef.enum && fieldDef.enum.length > 0) {
    return (
      <label className="block text-sm">
        {label}
        <select className={`${field} mt-1`} id={fieldId} value={String(value ?? "")} onChange={(e) => onChange(fieldDef.enum?.find((o) => String(o) === e.target.value) ?? e.target.value)}>
          {fieldDef.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (fieldDef.type === "object") {
    const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return (
      <fieldset className="rounded-xl border border-line p-3">
        <legend className="px-1 text-xs text-muted">{label}</legend>
        {Object.entries(fieldDef.properties ?? {}).map(([k, sub]) => (
          <ConfigField key={k} fieldDef={sub} label={sub.title || k} value={obj[k]} onChange={(v) => onChange({ ...obj, [k]: v })} />
        ))}
      </fieldset>
    );
  }
  if (fieldDef.type === "array") {
    const rows = Array.isArray(value) ? value : [];
    const item = fieldDef.items;
    if (!item) return <div className="text-xs text-muted">{label}</div>;
    return (
      <div>
        <div className="mb-1 text-xs text-muted">{label}</div>
        {rows.map((row, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <div className="flex-1">
              <ConfigField fieldDef={item} label={`#${i + 1}`} value={row} onChange={(v) => onChange(rows.map((r, j) => (j === i ? v : r)))} />
            </div>
            <button type="button" className={ghost} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button type="button" className={ghost} onClick={() => onChange([...rows, emptyForField(item)])}>
          <Plus size={12} /> Add
        </button>
      </div>
    );
  }
  if (fieldDef.type === "textarea") {
    return (
      <label className="block text-sm">
        {label}
        <textarea className={`${field} mt-1 min-h-20`} id={fieldId} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  return (
    <label className="block text-sm">
      {label}
      <input
        className={`${field} mt-1`}
        id={fieldId}
        type={fieldDef.type === "number" ? "number" : fieldDef.secret ? "password" : "text"}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(coerceFieldInput(fieldDef, e.target.value))}
      />
    </label>
  );
}
