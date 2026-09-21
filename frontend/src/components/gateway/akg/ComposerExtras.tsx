import { useState } from 'react';
import { sendContact, sendLocation } from '@/lib/openwa-api';
import { forwardMany, sendPollAkg, sendStickerAkg, sendTextList } from '@/lib/openwa/akg-api';
import { mapForwardMany } from '@/lib/openwa/akg-builders';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, btn, field, ghost, useCanWrite } from './akg-ui';

export function ComposerExtras({ sessionId, chatId }: { sessionId: string; chatId: string }) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pollName, setPollName] = useState('');
  const [pollOpts, setPollOpts] = useState('Yes\nNo');
  const [selectable, setSelectable] = useState('1');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [stickerUrl, setStickerUrl] = useState('');
  const [pack, setPack] = useState('OpenWA');
  const [author, setAuthor] = useState('OpenWA');
  const [fwdIds, setFwdIds] = useState('');
  const [fwdMsg, setFwdMsg] = useState('');
  const [listTitle, setListTitle] = useState('');
  const [listOpts, setListOpts] = useState('Option A\nOption B');
  const [fwdSummary, setFwdSummary] = useState('');

  if (!open) {
    return (
      <button type="button" className={`${ghost} mb-2`} onClick={() => setOpen(true)}>
        More send types
      </button>
    );
  }

  const disabled = !canWrite || !sessionId || !chatId;

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-line bg-night/30 p-3">
      <AkgBanner error={error} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Poll / contact / location / sticker / forward / list
        </span>
        <button type="button" className={ghost} onClick={() => setOpen(false)}>
          Hide
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <input
            className={field}
            value={pollName}
            onChange={e => setPollName(e.target.value)}
            placeholder="Poll question"
          />
          <textarea
            className={field}
            value={pollOpts}
            onChange={e => setPollOpts(e.target.value)}
            placeholder="Options, one per line"
          />
          <input
            className={field}
            value={selectable}
            onChange={e => setSelectable(e.target.value)}
            placeholder="selectableCount (1 = single)"
          />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void sendPollAkg(sessionId, {
                chatId,
                name: pollName,
                options: pollOpts
                  .split('\n')
                  .map(s => s.trim())
                  .filter(Boolean),
                selectableCount: Number(selectable),
              })
                .then(() => toast.success('Poll sent'))
                .catch(setError);
            }}
          >
            Send poll
          </button>
        </div>
        <div className="space-y-1">
          <input className={field} value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" />
          <input className={field} value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void sendLocation(sessionId, { chatId, latitude: Number(lat), longitude: Number(lng) })
                .then(() => toast.success('Location sent'))
                .catch(setError);
            }}
          >
            Send location
          </button>
          <input
            className={field}
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Contact name"
          />
          <input
            className={field}
            value={contactNumber}
            onChange={e => setContactNumber(e.target.value)}
            placeholder="Contact number"
          />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void sendContact(sessionId, { chatId, contactName, contactNumber })
                .then(() => toast.success('Contact sent'))
                .catch(setError);
            }}
          >
            Send contact
          </button>
        </div>
        <div className="space-y-1">
          <input
            className={field}
            value={stickerUrl}
            onChange={e => setStickerUrl(e.target.value)}
            placeholder="Sticker image URL"
          />
          <input className={field} value={pack} onChange={e => setPack(e.target.value)} placeholder="Pack name" />
          <input className={field} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author" />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void sendStickerAkg(sessionId, chatId, { url: stickerUrl, packName: pack, author })
                .then(() => toast.success('Sticker sent'))
                .catch(setError);
            }}
          >
            Send sticker
          </button>
        </div>
        <div className="space-y-1">
          <input
            className={field}
            value={fwdMsg}
            onChange={e => setFwdMsg(e.target.value)}
            placeholder="Message id to forward"
          />
          <textarea
            className={field}
            value={fwdIds}
            onChange={e => setFwdIds(e.target.value)}
            placeholder="Destination JIDs, one per line"
          />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void forwardMany(sessionId, {
                fromChatId: chatId,
                messageId: fwdMsg,
                toChatIds: fwdIds
                  .split('\n')
                  .map(s => s.trim())
                  .filter(Boolean),
              })
                .then(res => {
                  const mapped = mapForwardMany(res.status, res.results);
                  setFwdSummary(`HTTP ${mapped.httpStatus}: ${mapped.sent} sent, ${mapped.failed} failed`);
                  toast.success(`Forward ${mapped.httpStatus}`);
                })
                .catch(setError);
            }}
          >
            Multi-forward
          </button>
          {fwdSummary ? <p className="text-[11px] text-muted">{fwdSummary}</p> : null}
          <input
            className={field}
            value={listTitle}
            onChange={e => setListTitle(e.target.value)}
            placeholder="Text-list title"
          />
          <textarea
            className={field}
            value={listOpts}
            onChange={e => setListOpts(e.target.value)}
            placeholder="List options, one per line"
          />
          <button
            type="button"
            className={btn}
            disabled={disabled}
            onClick={() => {
              setError(null);
              void sendTextList(sessionId, {
                chatId,
                title: listTitle,
                options: listOpts
                  .split('\n')
                  .map(s => s.trim())
                  .filter(Boolean),
              })
                .then(() => toast.success('List sent'))
                .catch(setError);
            }}
          >
            Send text list
          </button>
        </div>
      </div>
    </div>
  );
}
