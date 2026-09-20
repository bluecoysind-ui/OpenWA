import { useState } from 'react';
import { convertSticker, sendStickerAkg } from '@/lib/openwa/akg-api';
import { MEDIA_UPLOAD_MAX_BYTES } from '@/lib/openwa/akg-builders';
import { useAppToast } from '@/lib/openwa/useToast';
import { Toggle } from '../settings/ui';
import { AkgBanner, Card, btn, field, useAkgFeatures, useAkgSession, useCanWrite } from './akg-ui';

export function StickerTool() {
  const toast = useAppToast();
  const flags = useAkgFeatures();
  const { sessionId } = useAkgSession();
  const canWrite = useCanWrite();
  const [chatId, setChatId] = useState('');
  const [pack, setPack] = useState('OpenWA');
  const [author, setAuthor] = useState('OpenWA');
  const [removeBg, setRemoveBg] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [converted, setConverted] = useState<{ base64: string; mimetype: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card
      title="Sticker convert"
      sub="Upload → convert → preview → send. Reuses the existing base64 path and size cap."
    >
      <AkgBanner error={error ?? flags.error} />
      <div className="grid gap-2">
        <input
          className={field}
          value={chatId}
          onChange={e => setChatId(e.target.value)}
          placeholder="Destination chat JID"
        />
        <input className={field} value={pack} onChange={e => setPack(e.target.value)} placeholder="Pack name" />
        <input className={field} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author" />
        {flags.data.removeBgConfigured ? (
          <label className="flex items-center gap-2 text-sm">
            <Toggle checked={removeBg} onChange={setRemoveBg} />
            Remove background
          </label>
        ) : (
          <p className="text-[11px] text-muted">remove.bg is not configured on this deployment.</p>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          disabled={!canWrite || busy}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !sessionId) return;
            if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
              toast.error('File exceeds the media size cap.');
              return;
            }
            setBusy(true);
            setError(null);
            void convertSticker(sessionId, file, { packName: pack, author, removeBg })
              .then(res => {
                setConverted(res);
                setPreview(`data:${res.mimetype};base64,${res.base64}`);
                toast.success('Converted');
              })
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        />
        {preview ? <img src={preview} alt="" className="max-h-40 w-auto object-contain" /> : null}
        <button
          type="button"
          className={btn}
          disabled={!canWrite || !converted || !chatId}
          onClick={() => {
            if (!converted) return;
            setError(null);
            void sendStickerAkg(sessionId, chatId, {
              base64: converted.base64,
              mimetype: converted.mimetype,
              packName: pack,
              author,
            })
              .then(() => toast.success('Sticker sent'))
              .catch(setError);
          }}
        >
          Send sticker
        </button>
      </div>
    </Card>
  );
}
