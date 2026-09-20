import { useEffect, useState } from 'react';
import { listTimeZones } from '@/lib/openwa/akg-datetime';
import { buildScheduledCreateBody } from '@/lib/openwa/akg-builders';
import {
  cancelScheduledMessage,
  createScheduledMessage,
  listScheduledMessages,
  updateScheduledMessage,
  type ScheduledMessage,
} from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import {
  AkgBanner,
  Card,
  ConfirmBar,
  EmptyHint,
  FlagOff,
  SessionSelect,
  btn,
  danger,
  field,
  ghost,
  useAkgFeatures,
  useAkgSession,
  useCanWrite,
} from './akg-ui';

const STATUS: Record<ScheduledMessage['status'], string> = {
  pending: 'bg-indigo/20 text-indigo',
  sending: 'bg-wa/20 text-wa',
  sent: 'bg-wa/15 text-wa',
  failed: 'bg-danger/15 text-danger',
  cancelled: 'bg-white/10 text-muted',
};

export function SchedulerPanel() {
  const toast = useAppToast();
  const flags = useAkgFeatures();
  const { sessions, sessionId, setSessionId } = useAkgSession();
  const canWrite = useCanWrite();
  const [rows, setRows] = useState<ScheduledMessage[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState('');
  const [when, setWhen] = useState('');
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const zones = listTimeZones();

  const reload = () => {
    if (!sessionId || !flags.data.scheduler) return;
    setLoading(true);
    listScheduledMessages(sessionId)
      .then(setRows)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setError(null);
    reload();
  }, [sessionId, flags.data.scheduler]);

  if (!flags.loading && !flags.data.scheduler) return <FlagOff name="Scheduler" />;

  const submit = async () => {
    setError(null);
    try {
      const body = buildScheduledCreateBody({ chatId, localDateTime: when, timeZone: tz, text, mediaUrl });
      if (editing) {
        await updateScheduledMessage(sessionId, editing.id, body);
        toast.success('Schedule updated');
        setEditing(null);
      } else {
        await createScheduledMessage(sessionId, body);
        toast.success('Scheduled');
      }
      setText('');
      setMediaUrl('');
      reload();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-3">
      <AkgBanner error={error ?? flags.error} />
      <Card
        title="Schedule a send"
        sub="Local date-time is converted to an ISO instant with the IANA offset (DST-correct). Goes through paced send. Ban-risk: do not stack many near-term jobs."
      >
        <div className="grid gap-2">
          <SessionSelect value={sessionId} onChange={setSessionId} sessions={sessions.data ?? []} />
          <input className={field} value={chatId} onChange={e => setChatId(e.target.value)} placeholder="chat JID" />
          <input className={field} type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
          <select className={field} value={tz} onChange={e => setTz(e.target.value)}>
            {zones.map(z => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <textarea
            className={field}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Text (or leave empty and set a media URL)"
          />
          <input
            className={field}
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder="https://… media URL (optional)"
          />
          <button type="button" className={btn} disabled={!canWrite || !sessionId} onClick={() => void submit()}>
            {editing ? 'Save changes' : 'Schedule'}
          </button>
          {!canWrite ? <p className="text-[11px] text-muted">Viewer key — writes hidden.</p> : null}
        </div>
      </Card>
      <Card title="Jobs" sub={loading ? 'Loading…' : `${rows.length} job(s)`}>
        {rows.length === 0 && !loading ? <EmptyHint>No scheduled messages.</EmptyHint> : null}
        <ul className="space-y-2">
          {rows.map(job => (
            <li key={job.id} className="rounded-xl border border-line bg-night/30 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS[job.status]}`}>{job.status}</span>
                  <div className="mt-1 font-medium">{job.chatId}</div>
                  <div className="text-[11px] text-muted">
                    {job.sendAt} · {job.timezone}
                  </div>
                  <div className="text-[12px]">{job.text || job.mediaUrl}</div>
                  {job.lastError ? <div className="mt-1 text-[11px] text-danger">{job.lastError}</div> : null}
                </div>
                {canWrite && job.status === 'pending' ? (
                  <div className="flex gap-1">
                    <button type="button" className={ghost} onClick={() => setEditing(job)}>
                      Edit
                    </button>
                    <button type="button" className={danger} onClick={() => setCancelId(job.id)}>
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
              {cancelId === job.id ? (
                <ConfirmBar
                  prompt="Cancel this pending send?"
                  onCancel={() => setCancelId(null)}
                  onConfirm={() => {
                    void cancelScheduledMessage(sessionId, job.id)
                      .then(() => {
                        toast.success('Cancelled');
                        setCancelId(null);
                        reload();
                      })
                      .catch(setError);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
