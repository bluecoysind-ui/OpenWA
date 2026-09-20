import { useState } from 'react';
import { deleteMessage, editMessage, reactToMessage, starMessage } from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, ConfirmBar, field, ghost, useCanWrite } from './akg-ui';

export function MessageActions({
  sessionId,
  chatId,
  messageId,
}: {
  sessionId: string;
  chatId: string;
  messageId: string;
}) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const [edit, setEdit] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (p: Promise<unknown>, ok: string) => {
    setError(null);
    void p.then(() => toast.success(ok)).catch(setError);
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <AkgBanner error={error} />
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(reactToMessage(sessionId, { chatId, messageId, emoji: '👍' }), 'Reacted')}
      >
        React
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(starMessage(sessionId, { chatId, messageId, star: true }), 'Starred')}
      >
        Star
      </button>
      <button type="button" className={ghost} disabled={!canWrite} onClick={() => setConfirmDelete(true)}>
        Delete
      </button>
      <input
        className={`${field} !w-32 !py-1 text-[11px]`}
        value={edit}
        onChange={e => setEdit(e.target.value)}
        placeholder="Edit text"
      />
      <button
        type="button"
        className={ghost}
        disabled={!canWrite || !edit.trim()}
        onClick={() => run(editMessage(sessionId, { chatId, messageId, body: edit }), 'Edited')}
      >
        Edit
      </button>
      {confirmDelete ? (
        <ConfirmBar
          prompt="Delete this message for everyone?"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            run(deleteMessage(sessionId, { chatId, messageId, forEveryone: true }), 'Deleted');
          }}
        />
      ) : null}
    </div>
  );
}
