import { useState } from 'react';
import { markChatRead } from '@/lib/openwa-api';
import { archiveChat, muteChat, pinChat } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, ghost, useCanWrite } from './akg-ui';

export function ChatHeaderActions({ sessionId, chatId }: { sessionId: string; chatId: string }) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const run = (p: Promise<unknown>, ok: string) => {
    setError(null);
    void p.then(() => toast.success(ok)).catch(setError);
  };
  return (
    <div className="flex items-center gap-1">
      <AkgBanner error={error} />
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(archiveChat(sessionId, chatId, true), 'Archived')}
      >
        Archive
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(muteChat(sessionId, chatId, 8 * 3600), 'Muted 8h')}
      >
        Mute 8h
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(muteChat(sessionId, chatId, null), 'Unmuted')}
      >
        Unmute
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(pinChat(sessionId, chatId, true), 'Pinned')}
      >
        Pin
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(markChatRead(sessionId, chatId), 'Read')}
      >
        Read
      </button>
    </div>
  );
}
