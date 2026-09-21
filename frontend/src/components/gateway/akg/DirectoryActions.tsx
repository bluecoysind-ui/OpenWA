import { useState } from 'react';
import { addGroupParticipants } from '@/lib/openwa-api';
import {
  addLabelToChat,
  blockContact,
  checkNumbers,
  leaveGroup,
  listGroupInvite,
  listLabels,
  setGroupSubject,
  unblockContact,
} from '@/lib/openwa/akg-api';
import { clampCheckNumbers, parseNumberList } from '@/lib/openwa/akg-builders';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, Card, ConfirmBar, btn, field, ghost, useCanWrite } from './akg-ui';

export function DirectoryActions({ sessionId, kind }: { sessionId: string; kind: 'dm' | 'group' }) {
  const toast = useAppToast();
  const canWrite = useCanWrite();
  const [error, setError] = useState<unknown>(null);
  const [numbers, setNumbers] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [contactId, setContactId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [invite, setInvite] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [labelId, setLabelId] = useState('');
  const [labels, setLabels] = useState<Array<{ id: string; name: string }>>([]);

  const run = (p: Promise<unknown>, ok: string) => {
    setError(null);
    void p.then(() => toast.success(ok)).catch(setError);
  };

  return (
    <div className="mb-4 space-y-3">
      <AkgBanner error={error} />
      {kind === 'dm' ? (
        <Card title="Contacts" sub="Bulk check is capped at 50 and paced. 429 is shown if the per-session limit trips.">
          <textarea
            className={field}
            value={numbers}
            onChange={e => setNumbers(e.target.value)}
            placeholder="Numbers, one per line (max 50)"
          />
          <button
            type="button"
            className={`${btn} mt-2`}
            disabled={!canWrite || !sessionId}
            onClick={() => {
              const list = clampCheckNumbers(parseNumberList(numbers));
              setError(null);
              void checkNumbers(sessionId, list)
                .then(r => {
                  setCheckOut(
                    r.results.map(x => `${x.input}: ${x.exists ? x.chatId : x.error || 'not on WhatsApp'}`).join('\n'),
                  );
                  toast.success('Checked');
                })
                .catch(setError);
            }}
          >
            Check numbers
          </button>
          {checkOut ? <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted">{checkOut}</pre> : null}
          <input
            className={`${field} mt-2`}
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            placeholder="Contact JID to block/unblock"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={ghost}
              disabled={!canWrite}
              onClick={() => run(blockContact(sessionId, contactId), 'Blocked')}
            >
              Block
            </button>
            <button
              type="button"
              className={ghost}
              disabled={!canWrite}
              onClick={() => run(unblockContact(sessionId, contactId), 'Unblocked')}
            >
              Unblock
            </button>
          </div>
        </Card>
      ) : (
        <Card title="Group tools" sub="Engine-unsupported calls show 501, not a generic crash.">
          <input className={field} value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Group JID" />
          <input
            className={`${field} mt-2`}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="New subject"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={btn}
              disabled={!canWrite}
              onClick={() => run(setGroupSubject(sessionId, groupId, subject), 'Subject set')}
            >
              Set subject
            </button>
            <button
              type="button"
              className={ghost}
              disabled={!canWrite}
              onClick={() => {
                setError(null);
                void listGroupInvite(sessionId, groupId)
                  .then(r => {
                    setInvite(r.inviteCode);
                    toast.success('Invite loaded');
                  })
                  .catch(setError);
              }}
            >
              Invite code
            </button>
            <button type="button" className={ghost} onClick={() => setLeaveConfirm(true)}>
              Leave
            </button>
          </div>
          {invite ? <p className="mt-2 text-[12px] text-muted">{invite}</p> : null}
          {leaveConfirm ? (
            <ConfirmBar
              prompt="Leave this group?"
              onCancel={() => setLeaveConfirm(false)}
              onConfirm={() => {
                setLeaveConfirm(false);
                run(leaveGroup(sessionId, groupId), 'Left');
              }}
            />
          ) : null}
          <textarea
            className={`${field} mt-2`}
            value={participants}
            onChange={e => setParticipants(e.target.value)}
            placeholder="Participant JIDs to add, one per line"
          />
          <button
            type="button"
            className={`${btn} mt-2`}
            disabled={!canWrite}
            onClick={() =>
              run(
                addGroupParticipants(
                  sessionId,
                  groupId,
                  participants
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean),
                ),
                'Participants added',
              )
            }
          >
            Add participants
          </button>
        </Card>
      )}
      <Card title="Labels" sub="whatsapp-web.js reads; Baileys writes. 501 means the engine cannot.">
        <button
          type="button"
          className={ghost}
          onClick={() => {
            setError(null);
            void listLabels(sessionId).then(setLabels).catch(setError);
          }}
        >
          Load labels
        </button>
        <select className={`${field} mt-2`} value={labelId} onChange={e => setLabelId(e.target.value)}>
          <option value="">Select label</option>
          {labels.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          className={`${field} mt-2`}
          value={contactId}
          onChange={e => setContactId(e.target.value)}
          placeholder="Chat JID to tag"
        />
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={!canWrite || !labelId}
          onClick={() => run(addLabelToChat(sessionId, contactId, labelId), 'Label added')}
        >
          Add label to chat
        </button>
      </Card>
    </div>
  );
}
