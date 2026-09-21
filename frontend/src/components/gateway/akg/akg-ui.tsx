import { useEffect, useState } from 'react';
import { useGateway } from '@/store/gateway-store';
import { btn, Card, danger, field, ghost } from '../settings/ui';
import { AKG_FEATURES_OFF, getAkgFeatures, type AkgFeatures } from '@/lib/openwa/akg-api';
import { describeAkgError, isViewerRole, type AkgErrorKind } from '@/lib/openwa/akg-http';
import { useSessionsQuery } from '@/lib/openwa-query';

export function useAkgFeatures() {
  const [data, setData] = useState<AkgFeatures>(AKG_FEATURES_OFF);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getAkgFeatures()
      .then(flags => {
        if (!cancelled) setData(flags);
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, error, loading };
}

export function useAkgSession() {
  const sessions = useSessionsQuery();
  const storeId = useGateway(s => s.activeAccountId);
  const [sessionId, setSessionId] = useState('');
  const sid = sessionId || storeId || sessions.data?.[0]?.id || '';
  return { sessions, sessionId: sid, setSessionId };
}

export function useCanWrite() {
  return !isViewerRole(useGateway(s => s.user));
}

export function SessionSelect({
  value,
  onChange,
  sessions,
}: {
  value: string;
  onChange: (id: string) => void;
  sessions: Array<{ id: string; name: string }>;
}) {
  return (
    <select className={field} value={value} onChange={e => onChange(e.target.value)}>
      {sessions.length === 0 ? <option value="">No sessions</option> : null}
      {sessions.map(s => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function AkgBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const { kind, message } = describeAkgError(error);
  const label: Record<AkgErrorKind, string> = {
    engine: 'Not supported by this engine',
    missing: 'Feature off or not found',
    rate: 'Rate limited',
    forbidden: 'Read-only key',
    generic: 'Error',
  };
  return (
    <p className="mb-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      <span className="font-semibold">{label[kind]}.</span> {message}
    </p>
  );
}

export function FlagOff({ name }: { name: string }) {
  return (
    <Card title={name} sub="This capability is turned off for this deployment.">
      <p className="text-sm text-muted">Enable the matching env flag and restart, or hide this screen.</p>
    </Card>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[12.5px] text-muted">{children}</p>;
}

export function ConfirmBar({
  prompt,
  onConfirm,
  onCancel,
  busy,
}: {
  prompt: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-2 rounded-xl border border-danger/30 bg-danger/10 p-3">
      <p className="text-sm text-danger">{prompt}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" className={danger} disabled={busy} onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" className={ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export { btn, Card, field, ghost, danger };
