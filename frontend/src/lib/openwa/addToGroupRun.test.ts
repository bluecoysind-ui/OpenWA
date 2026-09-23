import assert from "node:assert/strict";
import test from "node:test";
import { addAssignedPhones, addProgressStats, resolveGroupTarget } from "./addToGroupRun.ts";
import type { AddToGroupApis, ParticipantOutcome } from "./addToGroupRun.ts";

function mockApis(overrides: Partial<AddToGroupApis> = {}): AddToGroupApis & {
  saved: string[];
  added: string[];
  deleted: string[];
} {
  const saved: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  return {
    saved,
    added,
    deleted,
    upsertContact: async (_s, id) => {
      saved.push(id);
    },
    addParticipants: async (_s, _g, participants) => {
      added.push(...participants);
      return participants.map((id): ParticipantOutcome => ({ id, success: true, status: 200 }));
    },
    deleteContact: async (_s, id) => {
      deleted.push(id);
    },
    sleep: async () => undefined,
    random: () => 0,
    getGroupJoinInfo: async (_s, code) => ({ id: `${code}@g.us`, name: "ARV SOLUTION", participantCount: 12 }),
    ...overrides,
  };
}

test("resolveGroupTarget reads invite code via join-info", async () => {
  const apis = mockApis();
  const resolved = await resolveGroupTarget("sess", { kind: "invite", code: "JZHsmlwdrUWGnXBlSIzBEs" }, apis);
  assert.equal(resolved.groupId, "JZHsmlwdrUWGnXBlSIzBEs@g.us");
  assert.equal(resolved.name, "ARV SOLUTION");
});

test("addAssignedPhones saves, adds, then deletes on success", async () => {
  const apis = mockApis();
  const result = await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111", "222"] }],
    delayMs: 0,
    jitterMs: 0,
    apis,
  });
  assert.equal(result.added, 2);
  assert.equal(result.failed, 0);
  assert.deepEqual(apis.saved, ["111@c.us", "222@c.us"]);
  assert.deepEqual(apis.added, ["111@c.us", "222@c.us"]);
  assert.deepEqual(apis.deleted, ["111@c.us", "222@c.us"]);
  assert.equal(result.rows.filter((r) => r.step === "done").length, 2);
});

test("addAssignedPhones does not delete when add fails", async () => {
  const apis = mockApis({
    addParticipants: async () => [{ id: "111@c.us", success: false, status: 403, message: "not admin" }],
  });
  const result = await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111"] }],
    delayMs: 0,
    jitterMs: 0,
    apis,
  });
  assert.equal(result.added, 0);
  assert.equal(result.failed, 1);
  assert.deepEqual(apis.saved, ["111@c.us"]);
  assert.deepEqual(apis.deleted, []);
  assert.equal(result.rows.at(-1)?.step, "error");
});

test("addAssignedPhones skips add when save fails", async () => {
  const apis = mockApis({
    upsertContact: async () => {
      throw new Error("save refused");
    },
  });
  const result = await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111"] }],
    delayMs: 0,
    jitterMs: 0,
    apis,
  });
  assert.equal(result.failed, 1);
  assert.deepEqual(apis.added, []);
  assert.deepEqual(apis.deleted, []);
});

test("empty add results are a failure, not a silent success", async () => {
  const apis = mockApis({
    addParticipants: async () => [],
  });
  const result = await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111"] }],
    delayMs: 0,
    jitterMs: 0,
    apis,
  });
  assert.equal(result.added, 0);
  assert.equal(result.failed, 1);
  assert.deepEqual(apis.deleted, []);
  assert.equal(result.rows.at(-1)?.message, "No outcome from WhatsApp");
});

test("save failure still waits before the next number", async () => {
  const slept: number[] = [];
  const apis = mockApis({
    upsertContact: async (_s, id) => {
      if (id.startsWith("111")) throw new Error("save refused");
    },
    sleep: async (ms) => {
      slept.push(ms);
    },
  });
  const result = await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111", "222"] }],
    delayMs: 10,
    jitterMs: 0,
    apis,
  });
  assert.equal(result.failed, 1);
  assert.equal(result.added, 1);
  assert.deepEqual(apis.added, ["222@c.us"]);
  assert.equal(slept.length, 1);
});

test("addProgressStats counts added remaining and percent", () => {
  const stats = addProgressStats(
    [
      { phone: "1", sessionId: "a", step: "done", message: "added" },
      { phone: "2", sessionId: "a", step: "error", message: "no" },
      { phone: "3", sessionId: "a", step: "adding", message: "Adding to group…" },
    ],
    4,
  );
  assert.equal(stats.added, 1);
  assert.equal(stats.failed, 1);
  assert.equal(stats.remaining, 2);
  assert.equal(stats.percent, 50);
  assert.equal(stats.current?.phone, "3");
});

test("addAssignedPhones uses per-phone CSV names", async () => {
  const firstNames: string[] = [];
  const apis = mockApis({
    upsertContact: async (_s, id, firstName) => {
      firstNames.push(`${id}:${firstName}`);
    },
  });
  await addAssignedPhones({
    groupId: "g@g.us",
    assignments: [{ sessionId: "a", phones: ["111"] }],
    namesByPhone: { "111": "Rohit Singh" },
    delayMs: 0,
    jitterMs: 0,
    apis,
  });
  assert.deepEqual(firstNames, ["111@c.us:Rohit"]);
});
