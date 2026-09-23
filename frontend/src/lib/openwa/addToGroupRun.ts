import {
  contactJid,
  delayWithJitter,
  sleep as defaultSleep,
  splitContactName,
  type MemberAssignment,
} from "./addToGroupPlan.ts";
import type { GroupTarget } from "./groupInvite.ts";

export type AddStep = "queued" | "saving" | "adding" | "cleaning" | "done" | "error";

export type AddProgressRow = {
  phone: string;
  sessionId: string;
  step: AddStep;
  message: string;
};

export type ParticipantOutcome = { id: string; success: boolean; status?: number; message?: string };

export type AddToGroupApis = {
  upsertContact: (sessionId: string, contactId: string, firstName: string, lastName?: string) => Promise<void>;
  addParticipants: (sessionId: string, groupId: string, participants: string[]) => Promise<ParticipantOutcome[]>;
  deleteContact: (sessionId: string, contactId: string) => Promise<void>;
  getGroupJoinInfo?: (sessionId: string, code: string) => Promise<{ id: string; name?: string; participantCount?: number }>;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
};

export function addProgressStats(rows: AddProgressRow[], planned: number) {
  const added = rows.filter((r) => r.step === "done").length;
  const failed = rows.filter((r) => r.step === "error").length;
  const inFlight = rows.filter((r) => r.step === "saving" || r.step === "adding" || r.step === "cleaning").length;
  const processed = added + failed;
  const remaining = Math.max(0, planned - processed);
  const percent = planned <= 0 ? 0 : Math.min(100, Math.round((processed / planned) * 100));
  const current = rows.find((r) => r.step === "saving" || r.step === "adding" || r.step === "cleaning");
  return { added, failed, remaining, processed, inFlight, percent, planned, current };
}

export type ResolvedGroup = { groupId: string; name?: string; participantCount?: number };

export async function resolveGroupTarget(
  sessionId: string,
  target: GroupTarget,
  apis: Pick<AddToGroupApis, "getGroupJoinInfo">,
): Promise<ResolvedGroup> {
  if (target.kind === "jid") return { groupId: target.groupId };
  if (target.kind !== "invite") throw new Error("Paste a group invite link or pick a group.");
  const info = await apis.getGroupJoinInfo?.(sessionId, target.code);
  if (!info?.id) throw new Error("Could not resolve that invite link. It may be invalid or expired.");
  return { groupId: info.id, name: info.name, participantCount: info.participantCount };
}

function outcomeFor(phone: string, results: ParticipantOutcome[]): ParticipantOutcome | undefined {
  const jid = contactJid(phone);
  const digits = phone.replace(/\D/g, "");
  return results.find((r) => r.id === jid || r.id === phone || r.id.replace(/\D/g, "").startsWith(digits));
}

function errMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function isAbort(err: unknown): boolean {
  return (err instanceof Error && err.name === "AbortError") || (typeof DOMException === "function" && err instanceof DOMException && err.name === "AbortError");
}

export async function addAssignedPhones(args: {
  groupId: string;
  assignments: MemberAssignment[];
  name?: string;
  namesByPhone?: Record<string, string>;
  delayMs: number;
  jitterMs: number;
  signal?: AbortSignal;
  onRow?: (row: AddProgressRow) => void;
  apis: AddToGroupApis;
}): Promise<{ added: number; failed: number; rows: AddProgressRow[] }> {
  const rows: AddProgressRow[] = [];
  const emit = (row: AddProgressRow) => {
    rows.push(row);
    args.onRow?.(row);
  };
  const wait = args.apis.sleep ?? defaultSleep;
  const random = args.apis.random ?? Math.random;
  const queue = args.assignments.flatMap((a) => a.phones.map((phone) => ({ phone, sessionId: a.sessionId })));
  let added = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    if (args.signal?.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    const item = queue[i]!;
    const digits = item.phone.replace(/\D/g, "");
    const jid = contactJid(item.phone);
    const perName = args.namesByPhone?.[item.phone] || args.namesByPhone?.[digits];
    const names = splitContactName(perName || args.name, digits || "Contact");

    emit({ phone: item.phone, sessionId: item.sessionId, step: "saving", message: "Saving to address book…" });
    let saved = false;
    try {
      await args.apis.upsertContact(item.sessionId, jid, names.firstName, names.lastName);
      saved = true;
    } catch (err) {
      if (isAbort(err)) throw err;
      failed += 1;
      emit({ phone: item.phone, sessionId: item.sessionId, step: "error", message: errMessage(err, "Could not save contact") });
    }

    if (saved) {
      emit({ phone: item.phone, sessionId: item.sessionId, step: "adding", message: "Adding to group…" });
      let addedOk = false;
      let addMsg = "added";
      try {
        const results = await args.apis.addParticipants(item.sessionId, args.groupId, [jid]);
        const hit = outcomeFor(item.phone, results);
        if (hit) {
          addedOk = hit.success || hit.status === 409;
          addMsg = hit.message || (hit.status === 409 ? "already a member" : hit.success ? "added" : `WhatsApp refused (${hit.status ?? "unknown"})`);
        } else if (results.length === 0) {
          addMsg = "No outcome from WhatsApp";
        } else {
          addedOk = results.every((r) => r.success);
          if (!addedOk) addMsg = results.find((r) => !r.success)?.message || "WhatsApp refused";
        }
      } catch (err) {
        if (isAbort(err)) throw err;
        addMsg = errMessage(err, "Could not add to group");
      }

      if (!addedOk) {
        failed += 1;
        emit({ phone: item.phone, sessionId: item.sessionId, step: "error", message: addMsg });
      } else {
        emit({ phone: item.phone, sessionId: item.sessionId, step: "cleaning", message: "Removing from address book…" });
        try {
          await args.apis.deleteContact(item.sessionId, jid);
          added += 1;
          emit({ phone: item.phone, sessionId: item.sessionId, step: "done", message: addMsg });
        } catch (err) {
          if (isAbort(err)) throw err;
          added += 1;
          emit({
            phone: item.phone,
            sessionId: item.sessionId,
            step: "done",
            message: `${addMsg} — added, but address book cleanup failed: ${errMessage(err, "delete failed")}`,
          });
        }
      }
    }

    if (i < queue.length - 1) {
      await wait(delayWithJitter(args.delayMs, args.jitterMs, random), args.signal);
    }
  }

  return { added, failed, rows };
}
