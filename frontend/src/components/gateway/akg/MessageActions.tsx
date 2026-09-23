import { useState } from 'react';
import { deleteMessage, editMessage, reactToMessage, starMessage } from '@/lib/openwa/akg-api';
import { clickMessageButton, pinMessage, unpinMessage, votePoll } from '@/lib/openwa-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, ConfirmBar, field, ghost, useCanWrite } from './akg-ui';

export function MessageActions({
  sessionId,
  chatId,
  messageId,
  body = '',
}: {
  sessionId: string;
  chatId: string;
  messageId: string;
  body?: string;
}) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const [edit, setEdit] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [buttonId, setButtonId] = useState('');
  const [pollOption, setPollOption] = useState('');

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
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(pinMessage(sessionId, { chatId, messageId }), 'Pinned')}
      >
        Pin
      </button>
      <button
        type="button"
        className={ghost}
        disabled={!canWrite}
        onClick={() => run(unpinMessage(sessionId, { chatId, messageId }), 'Unpinned')}
      >
        Unpin
      </button>
      <input
        className={`${field} !w-24 !py-1 text-[11px]`}
        value={pollOption}
        onChange={e => setPollOption(e.target.value)}
        placeholder="Poll option"
      />
      <button
        type="button"
        className={ghost}
        disabled={!canWrite || !pollOption.trim()}
        onClick={() =>
          run(votePoll(sessionId, { chatId, messageId, selectedOptions: [pollOption.trim()] }), 'Vote sent')
        }
      >
        Vote
      </button>
      <input
        className={`${field} !w-24 !py-1 text-[11px]`}
        value={buttonId}
        onChange={e => setButtonId(e.target.value)}
        placeholder="Button id"
      />
      <button
        type="button"
        className={ghost}
        disabled={!canWrite || !buttonId.trim()}
        onClick={() =>
          run(
            clickMessageButton(sessionId, { chatId, messageId, buttonId: buttonId.trim(), text: body.slice(0, 40) }),
            'Button tapped',
          )
        }
      >
        Tap button
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
