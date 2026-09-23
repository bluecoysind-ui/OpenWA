import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateMembers,
  contactJid,
  delayWithJitter,
  evenSplitQuotas,
  quotasFromPerAccount,
  resolveQuotas,
  splitContactName,
} from "./addToGroupPlan.ts";

test("allocateMembers respects per-account quotas in order", () => {
  const plan = allocateMembers(["1", "2", "3", "4", "5"], [
    { sessionId: "a", count: 2 },
    { sessionId: "b", count: 2 },
  ]);
  assert.deepEqual(plan.assignments, [
    { sessionId: "a", phones: ["1", "2"] },
    { sessionId: "b", phones: ["3", "4"] },
  ]);
  assert.deepEqual(plan.leftover, ["5"]);
  assert.equal(plan.planned, 4);
});

test("allocateMembers All Accounts uses the same quota each", () => {
  const plan = allocateMembers(["a", "b", "c", "d", "e", "f"], quotasFromPerAccount(["s1", "s2", "s3"], 2));
  assert.equal(plan.assignments.length, 3);
  assert.deepEqual(plan.assignments[0]?.phones, ["a", "b"]);
  assert.deepEqual(plan.assignments[2]?.phones, ["e", "f"]);
  assert.deepEqual(plan.leftover, []);
});

test("allocateMembers skips zero quotas and does not overflow", () => {
  const plan = allocateMembers(["1", "2"], [
    { sessionId: "a", count: 0 },
    { sessionId: "b", count: 5 },
  ]);
  assert.deepEqual(plan.assignments, [{ sessionId: "b", phones: ["1", "2"] }]);
});

test("delayWithJitter stays in [base, base+jitter]", () => {
  assert.equal(delayWithJitter(3000, 2000, () => 0), 3000);
  assert.equal(delayWithJitter(3000, 2000, () => 1), 5000);
  assert.equal(delayWithJitter(-10, -5, () => 0.5), 0);
});

test("even split and resolveQuotas", () => {
  assert.deepEqual(evenSplitQuotas(["a", "b", "c"], 5), [
    { sessionId: "a", count: 2 },
    { sessionId: "b", count: 2 },
    { sessionId: "c", count: 1 },
  ]);
  const quotas = resolveQuotas({
    sessionIds: ["a", "b"],
    membersPerAccount: 10,
    overrides: { b: 3 },
    phoneCount: 40,
  });
  assert.deepEqual(quotas, [
    { sessionId: "a", count: 10 },
    { sessionId: "b", count: 3 },
  ]);
});

test("splitContactName and contactJid", () => {
  assert.deepEqual(splitContactName("Aryan Bhai", "x"), { firstName: "Aryan", lastName: "Bhai" });
  assert.deepEqual(splitContactName("", "9198"), { firstName: "9198" });
  assert.equal(contactJid("919430163152"), "919430163152@c.us");
  assert.equal(contactJid("123@c.us"), "123@c.us");
});
