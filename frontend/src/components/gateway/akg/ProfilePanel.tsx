import { useEffect, useState } from 'react';
import { getOwnProfile, setProfileName, setProfileStatus } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, Card, SessionSelect, btn, field, useAkgSession, useCanWrite } from './akg-ui';

export function ProfilePanel() {
  const toast = useAppToast();
  const { sessions, sessionId, setSessionId } = useAkgSession();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [picture, setPicture] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setError(null);
    void getOwnProfile(sessionId)
      .then(p => {
        setName(p.pushName ?? '');
        setStatus(p.status ?? '');
        setPhone(p.phone ?? '');
        setPicture(p.pictureUrl ?? null);
      })
      .catch(setError);
  }, [sessionId]);

  return (
    <div className="space-y-3">
      <AkgBanner error={error} />
      <Card title="Own profile" sub="501 means this engine cannot read or write the field.">
        <SessionSelect value={sessionId} onChange={setSessionId} sessions={sessions.data ?? []} />
        {picture ? <img src={picture} alt="" className="mt-3 size-16 rounded-full object-cover" /> : null}
        <p className="mt-2 text-[12px] text-muted">{phone || 'No phone yet'}</p>
        <input
          className={`${field} mt-2`}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Display name"
        />
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={!canWrite}
          onClick={() =>
            void setProfileName(sessionId, name)
              .then(() => toast.success('Name updated'))
              .catch(setError)
          }
        >
          Save name
        </button>
        <textarea
          className={`${field} mt-2`}
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="About / status"
        />
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={!canWrite}
          onClick={() =>
            void setProfileStatus(sessionId, status)
              .then(() => toast.success('Status updated'))
              .catch(setError)
          }
        >
          Save about
        </button>
        <p className="mt-2 text-[11px] text-dim">
          Picture changes use PUT /profile/picture with the existing base64 path and size cap.
        </p>
      </Card>
    </div>
  );
}
