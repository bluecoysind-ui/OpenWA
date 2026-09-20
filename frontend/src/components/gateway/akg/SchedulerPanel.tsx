import { useEffect, useState } from 'react';
import { isoInstantToLocalDateTime, listTimeZones } from '@/lib/openwa/akg-datetime';
import { buildScheduledCreateBody, type RecurrenceKind } from '@/lib/openwa/akg-builders';
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
  paused: 'bg-white/10 text-muted',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function recurrenceLabel(job: ScheduledMessage): string {
  if (!job.recurrence || job.recurrence === 'none') return 'one-shot';
  const every = job.interval > 1 ? ` every ${job.interval}` : '';
  if (job.recurrence === 'weekly') {
    const days = (job.daysOfWeek ?? []).map(d => WEEKDAYS[d] ?? d).join(',');
    return `weekly${every}${days ? ` (${days})` : ''}`;
  }
  if (job.recurrence === 'monthly') {
    return `monthly${every} (day ${job.dayOfMonth ?? '?'})`;
  }
  return `${job.recurrence}${every}`;
}

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
  const [recurrence, setRecurrence] = useState<RecurrenceKind>('none');
  const [interval, setIntervalN] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [until, setUntil] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState('12');
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

  const fillFrom = (job: ScheduledMessage) => {
    setEditing(job);
    setChatId(job.chatId);
    setText(job.text ?? '');
    setMediaUrl(job.mediaUrl ?? '');
    setTz(job.timezone);
    try {
      setWhen(isoInstantToLocalDateTime(job.sendAt, job.timezone));
    } catch {
      setWhen('');
    }
    setRecurrence(job.recurrence ?? 'none');
    setIntervalN(job.interval || 1);
    setDaysOfWeek(job.daysOfWeek?.length ? job.daysOfWeek : [1]);
    setDayOfMonth(job.dayOfMonth || 1);
    setUntil(job.until ? job.until.slice(0, 10) : '');
    setMaxOccurrences(job.maxOccurrences != null ? String(job.maxOccurrences) : '');
  };

  const submit = async () => {
    setError(null);
    try {
      const max = Number(maxOccurrences);
      const body = buildScheduledCreateBody({
        chatId,
        localDateTime: when,
        timeZone: tz,
        text,
        mediaUrl,
        recurrence,
        interval,
        daysOfWeek,
        dayOfMonth,
        until: until || undefined,
        maxOccurrences: Number.isFinite(max) && max > 0 ? max : undefined,
      });
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

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

  return (
    <div className="space-y-3">
      <AkgBanner error={error ?? flags.error} />
      <Card
        title="Schedule a send"
        sub="Local date-time is converted to an ISO instant with the IANA offset (DST-correct). Recurring fires stay on this row. Goes through paced send."
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
          <select
            className={field}
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as RecurrenceKind)}
          >
            <option value="none">one-shot</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
          {recurrence !== 'none' ? (
            <>
              <input
                className={field}
                type="number"
                min={1}
                value={interval}
                onChange={e => setIntervalN(Number(e.target.value) || 1)}
                placeholder="interval"
              />
              {recurrence === 'weekly' ? (
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((label, day) => (
                    <button
                      key={label}
                      type="button"
                      className={daysOfWeek.includes(day) ? btn : ghost}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              {recurrence === 'monthly' ? (
                <input
                  className={field}
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value) || 1)}
                  placeholder="day of month"
                />
              ) : null}
              <input
                className={field}
                type="date"
                value={until}
                onChange={e => setUntil(e.target.value)}
                placeholder="until date"
              />
              <input
                className={field}
                type="number"
                min={1}
                value={maxOccurrences}
                onChange={e => setMaxOccurrences(e.target.value)}
                placeholder="max occurrences"
              />
            </>
          ) : null}
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
                    next {job.sendAt} · {job.timezone} · {recurrenceLabel(job)}
                    {job.maxOccurrences != null ? ` · ${job.occurrenceCount ?? 0}/${job.maxOccurrences}` : ''}
                  </div>
                  <div className="text-[12px]">{job.text || job.mediaUrl}</div>
                  {job.lastError ? <div className="mt-1 text-[11px] text-danger">{job.lastError}</div> : null}
                </div>
                {canWrite && (job.status === 'pending' || job.status === 'paused') ? (
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className={ghost} onClick={() => fillFrom(job)}>
                      Edit
                    </button>
                    {job.status === 'pending' ? (
                      <button
                        type="button"
                        className={ghost}
                        onClick={() => {
                          void updateScheduledMessage(sessionId, job.id, { status: 'paused' })
                            .then(() => {
                              toast.success('Paused');
                              reload();
                            })
                            .catch(setError);
                        }}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={ghost}
                        onClick={() => {
                          void updateScheduledMessage(sessionId, job.id, { status: 'pending' })
                            .then(() => {
                              toast.success('Resumed');
                              reload();
                            })
                            .catch(setError);
                        }}
                      >
                        Resume
                      </button>
                    )}
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
