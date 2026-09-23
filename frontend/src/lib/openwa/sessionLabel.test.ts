import assert from "node:assert/strict";
import test from "node:test";
import { sessionDisplayName, sessionInitials, sessionShownInAccounts, contactDisplayName } from "./sessionLabel.ts";

test("sessionDisplayName prefers WhatsApp pushName", () => {
  assert.equal(
    sessionDisplayName({ name: "test2", pushName: "Aryan Bhai", phone: "916391943968" }),
    "Aryan Bhai",
  );
});

test("sessionDisplayName skips UUID session names", () => {
  assert.equal(
    sessionDisplayName({
      name: "4bad68ea-3c56-405c-b52a-61ae604bbed3",
      phoneNumber: "916391943968",
    }),
    "916391943968",
  );
});

test("sessionDisplayName falls back to local slug then id", () => {
  assert.equal(sessionDisplayName({ name: "test2" }), "test2");
  assert.equal(sessionDisplayName({ sessionId: "sess-1" }), "sess-1");
});

test("sessionInitials uses two words when present", () => {
  assert.equal(sessionInitials("Aryan Bhai"), "AB");
  assert.equal(sessionInitials("test2"), "TE");
});

test("sessionShownInAccounts hides failed and disconnected", () => {
  assert.equal(sessionShownInAccounts("connected"), true);
  assert.equal(sessionShownInAccounts("connecting"), true);
  assert.equal(sessionShownInAccounts("qr_ready"), true);
  assert.equal(sessionShownInAccounts("failed"), false);
  assert.equal(sessionShownInAccounts("disconnected"), false);
  assert.equal(sessionShownInAccounts("logged_out"), false);
});

test("contactDisplayName prefers saved name then pushName", () => {
  assert.equal(contactDisplayName({ name: "Aryan", pushName: "Aryan Bhai" }), "Aryan");
  assert.equal(contactDisplayName({ name: "", pushName: "Aryan Bhai" }), "Aryan Bhai");
  assert.equal(contactDisplayName(null), "");
});

test("contactDisplayName skips phone-like names", () => {
  assert.equal(contactDisplayName({ name: "+91 943 016 3152", pushName: "Raghav" }), "Raghav");
  assert.equal(contactDisplayName({ name: "919430163152", pushName: "" }), "");
});
