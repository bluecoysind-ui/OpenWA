import { useState } from 'react';
import { listWebhookDeliveries, type WebhookDelivery } from '@/lib/openwa/akg-api';
import { AkgBanner, btn, ghost } from './akg-ui';

export function WebhookDeliveries({ sessionId, webhookId }: { sessionId: string; webhookId: string }) {
  const [rows, setRows] = useState<WebhookDelivery[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className={ghost} onClick={() => setOpen(true)}>
        Deliveries
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <AkgBanner error={error} />
      <button
        type="button"
        className={btn}
        onClick={() => {
          setError(null);
          void listWebhookDeliveries(sessionId, webhookId).then(setRows).catch(setError);
        }}
      >
        Refresh deliveries
      </button>
      {rows && rows.length === 0 ? <p className="text-[11px] text-muted">No attempts recorded.</p> : null}
      <ul className="space-y-1 text-[11px]">
        {(rows ?? []).map(r => (
          <li key={r.id} className="rounded-lg border border-line bg-night/30 px-2 py-1">
            {r.status} · HTTP {r.httpCode ?? '—'} · {r.durationMs}ms · try {r.attempt}
            {r.errorSnippet ? ` · ${r.errorSnippet}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
