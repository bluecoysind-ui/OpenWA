import { useEffect, useState } from 'react';
import { fileToBase64 } from '@/lib/openwa-api';
import { deleteProfilePicture, setProfilePicture } from '@/lib/openwa/extended-api';
import { getOwnProfile, setProfileName, setProfileStatus } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, Card, SessionSelect, btn, field, ghost, useAkgSession, useCanWrite } from './akg-ui';

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
        setStatus(p.about ?? '');
        setPhone(p.phone ?? '');
        setPicture(p.profilePictureUrl ?? null);
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
        <input
          type="file"
          accept="image/*"
          className="mt-2 block w-full text-[11px]"
          disabled={!canWrite}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !sessionId) return;
            void fileToBase64(file)
              .then((media) =>
                setProfilePicture(sessionId, { base64: media.base64, mimetype: media.mimetype }),
              )
              .then(() => toast.success('Picture updated'))
              .catch(setError);
          }}
        />
        <button
          type="button"
          className={`${ghost} mt-2`}
          disabled={!canWrite}
          onClick={() =>
            void deleteProfilePicture(sessionId)
              .then(() => {
                setPicture(null);
                toast.success('Picture removed');
              })
              .catch(setError)
          }
        >
          Remove picture
        </button>
      </Card>
    </div>
  );
}
