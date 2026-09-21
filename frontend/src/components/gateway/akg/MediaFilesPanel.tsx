import { useEffect, useState } from 'react';
import { getOpenWAApiKey } from '@/lib/openwa-config';
import { deleteStoredMedia, listStoredMedia, storedMediaUrl, type StoredMediaFile } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import {
  AkgBanner,
  Card,
  ConfirmBar,
  EmptyHint,
  FlagOff,
  SessionSelect,
  danger,
  useAkgFeatures,
  useAkgSession,
  useCanWrite,
} from './akg-ui';

export function MediaFilesPanel() {
  const toast = useAppToast();
  const flags = useAkgFeatures();
  const { sessions, sessionId, setSessionId } = useAkgSession();
  const canWrite = useCanWrite();
  const [rows, setRows] = useState<StoredMediaFile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const key = getOpenWAApiKey();

  const reload = () => {
    if (!sessionId || !flags.data.mediaPersist) return;
    listStoredMedia(sessionId).then(setRows).catch(setError);
  };

  useEffect(() => {
    setError(null);
    reload();
  }, [sessionId, flags.data.mediaPersist]);

  if (!flags.loading && !flags.data.mediaPersist) return <FlagOff name="Media files" />;

  return (
    <div className="space-y-3">
      <AkgBanner error={error ?? flags.error} />
      <Card
        title="Stored inbound media"
        sub="Only listed when MEDIA_PERSIST is on. Download uses the existing API-key header."
      >
        <SessionSelect value={sessionId} onChange={setSessionId} sessions={sessions.data ?? []} />
        {rows.length === 0 ? <EmptyHint>No stored files.</EmptyHint> : null}
        <ul className="mt-3 space-y-2">
          {rows.map(f => {
            const messageId = f.messageId;
            return (
              <li
                key={`${messageId}-${f.url}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-night/30 p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{messageId || '(no message id)'}</div>
                  <div className="text-[11px] text-muted">{f.createdAt}</div>
                </div>
                <div className="flex gap-2">
                  {messageId ? (
                    <a
                      className="text-[12px] text-indigo underline"
                      href={storedMediaUrl(sessionId, messageId)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => {
                        if (!key) return;
                        e.preventDefault();
                        void fetch(storedMediaUrl(sessionId, messageId), { headers: { 'X-API-Key': key } })
                          .then(r => r.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = messageId || 'media';
                            a.click();
                            URL.revokeObjectURL(url);
                          })
                          .catch(setError);
                      }}
                    >
                      Download
                    </a>
                  ) : null}
                  {canWrite && messageId ? (
                    <button type="button" className={danger} onClick={() => setDeleteId(messageId)}>
                      Delete
                    </button>
                  ) : null}
                </div>
                {deleteId && deleteId === messageId ? (
                  <ConfirmBar
                    prompt="Delete this stored file?"
                    onCancel={() => setDeleteId(null)}
                    onConfirm={() => {
                      void deleteStoredMedia(sessionId, deleteId)
                        .then(() => {
                          setDeleteId(null);
                          toast.success('Deleted');
                          reload();
                        })
                        .catch(setError);
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
