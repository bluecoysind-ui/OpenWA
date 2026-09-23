import { useState } from 'react';
import { addGroupParticipants, fileToBase64 } from '@/lib/openwa-api';
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
import {
  approveGroupMembershipRequests,
  createGroup,
  deleteContact,
  deleteLabel,
  demoteGroupParticipants,
  getGroupJoinInfo,
  joinGroup,
  listBlockedContacts,
  listGroupMembershipRequests,
  promoteGroupParticipants,
  rejectGroupMembershipRequests,
  removeGroupParticipants,
  removeLabelFromChat,
  revokeGroupInvite,
  setGroupDescription,
  setGroupPicture,
  updateContact,
  updateGroupSettings,
  updateLabel,
} from '@/lib/openwa/extended-api';
import { clampCheckNumbers, parseNumberList } from '@/lib/openwa/akg-builders';
import { useAppToast } from '@/lib/openwa/useToast';
import { AkgBanner, Card, ConfirmBar, btn, danger, field, ghost, useCanWrite } from './akg-ui';

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
  const [joinCode, setJoinCode] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createMembers, setCreateMembers] = useState('');
  const [description, setDescription] = useState('');
  const [settingsJson, setSettingsJson] = useState('{"announce":false,"restrict":false}');
  const [membershipIds, setMembershipIds] = useState('');
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [contactName, setContactName] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [labelId, setLabelId] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labels, setLabels] = useState<Array<{ id: string; name: string }>>([]);

  const run = (p: Promise<unknown>, ok: string) => {
    setError(null);
    void p.then(() => toast.success(ok)).catch(setError);
  };

  const participantList = () =>
    participants
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

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
            placeholder="Contact JID"
          />
          <input
            className={`${field} mt-2`}
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Display name (PUT contact)"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={ghost}
              disabled={!canWrite}
              onClick={() => run(updateContact(sessionId, contactId, { name: contactName }), 'Contact updated')}
            >
              Update contact
            </button>
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
            <button
              type="button"
              className={ghost}
              onClick={() => {
                setError(null);
                void listBlockedContacts(sessionId)
                  .then(r =>
                    setBlockedList(
                      r.map(row =>
                        typeof row === 'string' ? row : String((row as { id?: string }).id ?? JSON.stringify(row)),
                      ),
                    ),
                  )
                  .catch(setError);
              }}
            >
              List blocked
            </button>
            <button
              type="button"
              className={danger}
              disabled={!canWrite}
              onClick={() => run(deleteContact(sessionId, contactId), 'Contact deleted')}
            >
              Delete contact
            </button>
          </div>
          {blockedList.length ? (
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted">{blockedList.join('\n')}</pre>
          ) : null}
        </Card>
      ) : (
        <>
          <Card title="Join / create" sub="Invite codes and new groups.">
            <input className={field} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Invite code" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={ghost}
                onClick={() => {
                  setError(null);
                  void getGroupJoinInfo(sessionId, joinCode).then(r => toast.success('Preview', JSON.stringify(r))).catch(setError);
                }}
              >
                Preview join
              </button>
              <button
                type="button"
                className={btn}
                disabled={!canWrite}
                onClick={() => run(joinGroup(sessionId, joinCode), 'Joined')}
              >
                Join group
              </button>
            </div>
            <input
              className={`${field} mt-2`}
              value={createSubject}
              onChange={e => setCreateSubject(e.target.value)}
              placeholder="New group subject"
            />
            <textarea
              className={`${field} mt-2`}
              value={createMembers}
              onChange={e => setCreateMembers(e.target.value)}
              placeholder="Initial participant JIDs"
            />
            <button
              type="button"
              className={`${btn} mt-2`}
              disabled={!canWrite}
              onClick={() =>
                run(
                  createGroup(sessionId, {
                    subject: createSubject,
                    participants: createMembers.split('\n').map(s => s.trim()).filter(Boolean),
                  }),
                  'Group created',
                )
              }
            >
              Create group
            </button>
          </Card>
          <Card title="Group tools" sub="Engine-unsupported calls show 501, not a generic crash.">
            <input className={field} value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Group JID" />
            <input
              className={`${field} mt-2`}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="New subject"
            />
            <textarea
              className={`${field} mt-2`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Group description"
            />
            <textarea
              className={`${field} mt-2`}
              value={settingsJson}
              onChange={e => setSettingsJson(e.target.value)}
              placeholder='Settings JSON e.g. {"announce":true}'
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
                onClick={() => run(setGroupDescription(sessionId, groupId, description), 'Description set')}
              >
                Set description
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() => {
                  try {
                    const body = JSON.parse(settingsJson) as Record<string, unknown>;
                    run(updateGroupSettings(sessionId, groupId, body), 'Settings updated');
                  } catch {
                    setError(new Error('Settings must be valid JSON'));
                  }
                }}
              >
                Update settings
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
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() => run(revokeGroupInvite(sessionId, groupId), 'Invite revoked')}
              >
                Revoke invite
              </button>
              <button type="button" className={ghost} onClick={() => setLeaveConfirm(true)}>
                Leave
              </button>
            </div>
            {invite ? <p className="mt-2 text-[12px] text-muted">{invite}</p> : null}
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-[11px]"
              disabled={!canWrite}
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file || !groupId) return;
                void fileToBase64(file)
                  .then(media => setGroupPicture(sessionId, groupId, { base64: media.base64, mimetype: media.mimetype }))
                  .then(() => toast.success('Group picture set'))
                  .catch(setError);
              }}
            />
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
              placeholder="Participant JIDs, one per line"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={btn}
                disabled={!canWrite}
                onClick={() => run(addGroupParticipants(sessionId, groupId, participantList()), 'Participants added')}
              >
                Add
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() => run(removeGroupParticipants(sessionId, groupId, participantList()), 'Removed')}
              >
                Remove
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() => run(promoteGroupParticipants(sessionId, groupId, participantList()), 'Promoted')}
              >
                Promote
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() => run(demoteGroupParticipants(sessionId, groupId, participantList()), 'Demoted')}
              >
                Demote
              </button>
            </div>
            <textarea
              className={`${field} mt-2`}
              value={membershipIds}
              onChange={e => setMembershipIds(e.target.value)}
              placeholder="Membership request JIDs"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={ghost}
                onClick={() => {
                  setError(null);
                  void listGroupMembershipRequests(sessionId, groupId)
                    .then(r => toast.success('Requests', JSON.stringify(r)))
                    .catch(setError);
                }}
              >
                List requests
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() =>
                  run(
                    approveGroupMembershipRequests(
                      sessionId,
                      groupId,
                      membershipIds.split('\n').map(s => s.trim()).filter(Boolean),
                    ),
                    'Approved',
                  )
                }
              >
                Approve
              </button>
              <button
                type="button"
                className={ghost}
                disabled={!canWrite}
                onClick={() =>
                  run(
                    rejectGroupMembershipRequests(
                      sessionId,
                      groupId,
                      membershipIds.split('\n').map(s => s.trim()).filter(Boolean),
                    ),
                    'Rejected',
                  )
                }
              >
                Reject
              </button>
            </div>
          </Card>
        </>
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
          value={labelName}
          onChange={e => setLabelName(e.target.value)}
          placeholder="Rename label (selected id)"
        />
        <input
          className={`${field} mt-2`}
          value={contactId}
          onChange={e => setContactId(e.target.value)}
          placeholder="Chat JID to tag"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={!canWrite || !labelId}
            onClick={() => run(addLabelToChat(sessionId, contactId, labelId), 'Label added')}
          >
            Add to chat
          </button>
          <button
            type="button"
            className={ghost}
            disabled={!canWrite || !labelId}
            onClick={() => run(removeLabelFromChat(sessionId, contactId, labelId), 'Label removed')}
          >
            Remove from chat
          </button>
          <button
            type="button"
            className={ghost}
            disabled={!canWrite || !labelId}
            onClick={() => run(updateLabel(sessionId, labelId, { name: labelName }), 'Label updated')}
          >
            Rename label
          </button>
          <button
            type="button"
            className={danger}
            disabled={!canWrite || !labelId}
            onClick={() => run(deleteLabel(sessionId, labelId), 'Label deleted')}
          >
            Delete label
          </button>
        </div>
      </Card>
    </div>
  );
}
