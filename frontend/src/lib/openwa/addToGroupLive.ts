import { addGroupParticipants } from "../openwa-api";
import { deleteContact, getGroupJoinInfo, updateContact } from "./extended-api";
import type { AddToGroupApis } from "./addToGroupRun.ts";

function asJoinInfo(raw: unknown): { id: string; name?: string; participantCount?: number } {
  if (!raw || typeof raw !== "object") throw new Error("Invite preview failed");
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) throw new Error("That invite did not include a group id.");
  return {
    id,
    name: typeof o.name === "string" ? o.name : undefined,
    participantCount: typeof o.participantCount === "number" ? o.participantCount : undefined,
  };
}

export const liveAddToGroupApis: AddToGroupApis = {
  upsertContact: async (sessionId, contactId, firstName, lastName) => {
    await updateContact(sessionId, contactId, lastName ? { firstName, lastName } : { firstName });
  },
  addParticipants: async (sessionId, groupId, participants) => {
    const res = await addGroupParticipants(sessionId, groupId, participants);
    if (Array.isArray(res.results)) return res.results;
    return participants.map((id) => ({ id, success: true, status: 200 }));
  },
  deleteContact: async (sessionId, contactId) => {
    await deleteContact(sessionId, contactId);
  },
  getGroupJoinInfo: async (sessionId, code) => asJoinInfo(await getGroupJoinInfo(sessionId, code)),
};
