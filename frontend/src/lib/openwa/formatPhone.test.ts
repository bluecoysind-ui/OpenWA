import assert from "node:assert/strict";
import test from "node:test";
import { formatPhoneForDisplay, parsePhoneFromJid } from "./formatPhone.ts";

test("parsePhoneFromJid rejects groups and lids", () => {
  assert.equal(parsePhoneFromJid("120363@g.us"), null);
  assert.equal(parsePhoneFromJid("262813@lid"), null);
  assert.equal(parsePhoneFromJid("628123456789@c.us"), "628123456789");
});

test("formatPhoneForDisplay formats MSISDN", () => {
  assert.equal(formatPhoneForDisplay("628123456789"), "+62 812 345 6789");
});
