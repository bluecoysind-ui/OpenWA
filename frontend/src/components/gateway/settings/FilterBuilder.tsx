import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CHAT_KINDS, MESSAGE_TYPES, type OpenWAChat, type WebhookFilterCondition, type WebhookFilterOperator, type WebhookFilters } from "@/lib/openwa-api";
import { field, ghost } from "./ui";

type FieldKind = "id" | "idArray" | "text" | "enum" | "boolean";
interface FieldDescriptor {
  field: string;
  kind: FieldKind;
  operators: WebhookFilterOperator[];
  enumValues?: readonly string[];
}

const MESSAGE_FIELDS: FieldDescriptor[] = [
  { field: "sender", kind: "id", operators: ["is", "isNot"] },
  { field: "recipient", kind: "id", operators: ["is", "isNot"] },
  { field: "chatId", kind: "id", operators: ["is", "isNot"] },
  { field: "body", kind: "text", operators: ["contains", "equals"] },
  { field: "type", kind: "enum", operators: ["is", "isNot"], enumValues: MESSAGE_TYPES },
  { field: "isGroup", kind: "boolean", operators: ["is"] },
  { field: "kind", kind: "enum", operators: ["is", "isNot"], enumValues: CHAT_KINDS },
  { field: "fromMe", kind: "boolean", operators: ["is"] },
  { field: "hasMedia", kind: "boolean", operators: ["is"] },
  { field: "mentions", kind: "idArray", operators: ["is", "isNot"] },
];

const descriptorFor = (fieldName: string): FieldDescriptor => MESSAGE_FIELDS.find((f) => f.field === fieldName) ?? MESSAGE_FIELDS[0];
function defaultValueFor(kind: FieldKind): WebhookFilterCondition["value"] {
  if (kind === "boolean") return true;
  if (kind === "text") return "";
  return [];
}
function normalizeToJid(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) return value.toLowerCase();
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? `${digits}@c.us` : null;
}

function ContactChipsInput({ value, onChange, chats }: { value: string[]; onChange: (next: string[]) => void; chats: OpenWAChat[] }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const query = text.trim().toLowerCase();
    const chosen = new Set(value);
    return chats
      .filter((c) => !chosen.has(c.id))
      .filter((c) => !query || c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query))
      .slice(0, 50);
  }, [text, chats, value]);
  const add = (jid: string) => {
    if (jid && !value.includes(jid)) onChange([...value, jid]);
    setText("");
  };
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-night/40 p-2">
        {value.map((jid) => (
          <span key={jid} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-[11px]">
            {chats.find((c) => c.id === jid)?.name ?? jid}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== jid))}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          value={text}
          placeholder="Phone or chat"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const jid = normalizeToJid(text);
              if (jid) add(jid);
            }
          }}
        />
      </div>
      {open && (suggestions.length > 0 || text.trim()) ? (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-line bg-night p-1">
          {suggestions.map((c) => (
            <button key={c.id} type="button" className="block w-full rounded-lg px-2 py-1 text-left text-xs hover:bg-white/5" onMouseDown={(e) => e.preventDefault()} onClick={() => add(c.id)}>
              {c.name || c.id}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilterBuilder({
  filters,
  onChange,
  chats,
}: {
  filters: WebhookFilters | null | undefined;
  onChange: (filters: WebhookFilters | null) => void;
  chats: OpenWAChat[];
}) {
  const conditions = filters?.conditions ?? [];
  const emit = (next: WebhookFilterCondition[]) => onChange(next.length ? { conditions: next } : null);
  const updateAt = (index: number, patch: Partial<WebhookFilterCondition>) =>
    emit(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const changeField = (index: number, fieldName: string) => {
    const def = descriptorFor(fieldName);
    updateAt(index, { field: fieldName, operator: def.operators[0], value: defaultValueFor(def.kind), caseSensitive: undefined });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted">Filters apply to message.* events. All conditions must match.</p>
      {conditions.map((condition, index) => {
        const def = descriptorFor(condition.field);
        return (
          <div key={index} className="grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_auto]">
            <select className={field} value={condition.field} onChange={(e) => changeField(index, e.target.value)}>
              {MESSAGE_FIELDS.map((f) => (
                <option key={f.field} value={f.field}>
                  {f.field}
                </option>
              ))}
            </select>
            <select className={field} value={condition.operator} onChange={(e) => updateAt(index, { operator: e.target.value as WebhookFilterOperator })}>
              {def.operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <button type="button" className={ghost} onClick={() => emit(conditions.filter((_, i) => i !== index))}>
              <X size={14} />
            </button>
            <div className="sm:col-span-3">
              {def.kind === "id" || def.kind === "idArray" ? (
                <ContactChipsInput value={Array.isArray(condition.value) ? (condition.value as string[]) : []} onChange={(next) => updateAt(index, { value: next })} chats={chats} />
              ) : null}
              {def.kind === "enum" ? (
                <div className="flex flex-wrap gap-1">
                  {def.enumValues?.map((option) => {
                    const selected = Array.isArray(condition.value) && (condition.value as string[]).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        className={selected ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px]"}
                        onClick={() => {
                          const current = Array.isArray(condition.value) ? (condition.value as string[]) : [];
                          updateAt(index, { value: selected ? current.filter((v) => v !== option) : [...current, option] });
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {def.kind === "text" ? (
                <div className="flex gap-2">
                  <input className={field} value={typeof condition.value === "string" ? condition.value : ""} onChange={(e) => updateAt(index, { value: e.target.value })} />
                  <label className="flex items-center gap-1 text-[11px] text-muted">
                    <input type="checkbox" checked={condition.caseSensitive ?? false} onChange={(e) => updateAt(index, { caseSensitive: e.target.checked || undefined })} />
                    Aa
                  </label>
                </div>
              ) : null}
              {def.kind === "boolean" ? (
                <select className={field} value={condition.value === true ? "true" : "false"} onChange={(e) => updateAt(index, { value: e.target.value === "true" })}>
                  <option value="true">yes</option>
                  <option value="false">no</option>
                </select>
              ) : null}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className={ghost}
        onClick={() => {
          const def = MESSAGE_FIELDS[0];
          emit([...conditions, { field: def.field, operator: def.operators[0], value: defaultValueFor(def.kind) }]);
        }}
      >
        <Plus size={14} /> Add condition
      </button>
    </div>
  );
}
