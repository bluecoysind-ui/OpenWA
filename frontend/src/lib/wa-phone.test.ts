import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractScrapePhone, isScrapableMemberJid } from "./wa-phone.ts";

describe("extractScrapePhone", () => {
  it("uses the @c.us user-part as the phone", () => {
    assert.equal(extractScrapePhone("628123456789@c.us", ""), "628123456789");
  });

  it("derives phone from @s.whatsapp.net jid", () => {
    assert.equal(extractScrapePhone("628987654321@s.whatsapp.net", undefined), "628987654321");
  });

  it("does not treat LID digits in number as a phone", () => {
    assert.equal(extractScrapePhone("123456789012345@lid", "123456789012345"), "lid:123456789012345");
  });

  it("uses a real MSISDN reported alongside a LID", () => {
    assert.equal(extractScrapePhone("123456789012345@lid", "628123456789"), "628123456789");
  });

  it("ignores group jids", () => {
    assert.equal(extractScrapePhone("120363@g.us", "0"), "");
  });

  it("strips formatting from reported numbers", () => {
    assert.equal(extractScrapePhone("x@c.us", "+62 812-3456-7890"), "6281234567890");
  });
});

describe("isScrapableMemberJid", () => {
  it("rejects group addresses", () => {
    assert.equal(isScrapableMemberJid("120363@g.us"), false);
  });

  it("accepts user jids", () => {
    assert.equal(isScrapableMemberJid("6281@c.us"), true);
  });
});
