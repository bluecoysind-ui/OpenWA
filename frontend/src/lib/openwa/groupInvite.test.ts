import assert from "node:assert/strict";
import test from "node:test";
import { parseGroupInviteCode, parseGroupTarget } from "./groupInvite.ts";

const EXAMPLE = "https://chat.whatsapp.com/JZHsmlwdrUWGnXBlSIzBEs?s=cl&p=a&mlu=4&ilr=4";

test("parseGroupInviteCode strips query flags from a chat.whatsapp.com link", () => {
  assert.equal(parseGroupInviteCode(EXAMPLE), "JZHsmlwdrUWGnXBlSIzBEs");
});

test("parseGroupInviteCode accepts a clean invite URL and a bare code", () => {
  assert.equal(parseGroupInviteCode("https://chat.whatsapp.com/JZHsmlwdrUWGnXBlSIzBEs"), "JZHsmlwdrUWGnXBlSIzBEs");
  assert.equal(parseGroupInviteCode("JZHsmlwdrUWGnXBlSIzBEs"), "JZHsmlwdrUWGnXBlSIzBEs");
  assert.equal(parseGroupInviteCode("  chat.whatsapp.com/JZHsmlwdrUWGnXBlSIzBEs  "), "JZHsmlwdrUWGnXBlSIzBEs");
});

test("parseGroupInviteCode rejects empty, garbage, and channel-style hosts", () => {
  assert.equal(parseGroupInviteCode(""), null);
  assert.equal(parseGroupInviteCode("https://example.com/JZHsmlwdrUWGnXBlSIzBEs"), null);
  assert.equal(parseGroupInviteCode("not-a-code"), null);
});

test("parseGroupTarget recognizes a group JID", () => {
  assert.deepEqual(parseGroupTarget("120363012345678901@g.us"), {
    kind: "jid",
    groupId: "120363012345678901@g.us",
  });
});
