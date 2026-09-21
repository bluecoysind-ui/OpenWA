import { useEffect, useRef, useState } from 'react';
import { markChatRead } from '@/lib/openwa-api';
import { archiveChat, muteChat, pinChat } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { IconDots } from '../icons';
import { AkgBanner, useCanWrite } from './akg-ui';

const menuItem =
  'flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-ink hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';

export function ChatHeaderActions({ sessionId, chatId }: { sessionId: string; chatId: string }) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setError(null);
  }, [sessionId, chatId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (p: Promise<unknown>, ok: string) => {
    setError(null);
    void p
      .then(() => {
        toast.success(ok);
        setOpen(false);
      })
      .catch(setError);
  };

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        className="relative grid size-9 place-items-center rounded-[10px] border border-line bg-white/5 text-ink/80 hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Chat actions"
        onClick={() => setOpen(v => !v)}
      >
        <IconDots />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-line bg-night p-1 shadow-lg">
          {error ? (
            <div className="px-1 pt-1 [&_p]:mb-1 [&_p]:px-2 [&_p]:py-1.5 [&_p]:text-[11px]">
              <AkgBanner error={error} />
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={!canWrite}
            onClick={() => run(archiveChat(sessionId, chatId, true), 'Archived')}
          >
            Archive
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={!canWrite}
            onClick={() => run(muteChat(sessionId, chatId, 8 * 3600), 'Muted 8h')}
          >
            Mute 8h
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={!canWrite}
            onClick={() => run(muteChat(sessionId, chatId, null), 'Unmuted')}
          >
            Unmute
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={!canWrite}
            onClick={() => run(pinChat(sessionId, chatId, true), 'Pinned')}
          >
            Pin
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={!canWrite}
            onClick={() => run(markChatRead(sessionId, chatId), 'Read')}
          >
            Mark read
          </button>
        </div>
      ) : null}
    </div>
  );
}
