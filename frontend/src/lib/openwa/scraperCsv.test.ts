import assert from "node:assert/strict";
import test from "node:test";
import { formatScraperContactsCsv, parseScraperContactsCsv, SCRAPER_CSV_HEADERS } from "./scraperCsv.ts";

test("scraper CSV round-trips the Group Scraper header", () => {
  const csv = formatScraperContactsCsv([
    { phone: "919430163152", name: "Rohit Singh", jid: "919430163152@c.us", groups: ["ARV SOLUTION"], sources: ["test2"] },
    { phone: "", name: "Hidden", jid: "123@lid", groups: ["ARV SOLUTION"] },
    { phone: "628123456789", name: "Ada", jid: "628123456789@c.us" },
  ]);
  assert.equal(csv.split("\n")[0], SCRAPER_CSV_HEADERS.join(","));
  const parsed = parseScraperContactsCsv(csv);
  assert.deepEqual(parsed.phones, ["919430163152", "628123456789"]);
  assert.equal(parsed.names["919430163152"], "Rohit Singh");
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.totalRows, 3);
});

test("parseScraperContactsCsv reads the export with quoted commas", () => {
  const csv = [
    "phone,name,jid,groups,sources",
    '628111111111,"Lead, HQ",628111111111@c.us,"Sales | West",acc-1',
  ].join("\n");
  const parsed = parseScraperContactsCsv(csv);
  assert.deepEqual(parsed.phones, ["628111111111"]);
  assert.equal(parsed.names["628111111111"], "Lead, HQ");
});

test("parseScraperContactsCsv falls back to jid when phone is empty", () => {
  const csv = "phone,name,jid,groups,sources\n,Ada,628987654321@c.us,,";
  const parsed = parseScraperContactsCsv(csv);
  assert.deepEqual(parsed.phones, ["628987654321"]);
});
