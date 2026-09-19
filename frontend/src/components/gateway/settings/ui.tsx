import { cn } from "@/lib/cn";

export const field =
  "w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-dim";
export const btn = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-wa px-3 py-2 text-xs font-semibold text-night disabled:opacity-50";
export const ghost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-white/5 disabled:opacity-50";
export const danger =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/40 px-3 py-2 text-xs text-danger hover:bg-danger/10 disabled:opacity-50";

export function Card({ title, sub, children, actions }: { title: string; sub?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {sub ? <p className="mt-0.5 text-[11.5px] text-muted">{sub}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function ErrorLine({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Request failed";
  return <p className="mb-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>;
}

export function Toggle({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition",
        checked ? "border-wa/40 bg-wa" : "border-line bg-white/10",
      )}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition", checked ? "left-5" : "left-0.5")} />
    </button>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={cn("glass max-h-[90vh] overflow-y-auto rounded-3xl p-6 text-left", wide ? "w-full max-w-3xl" : "w-full max-w-lg")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" className={ghost} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
