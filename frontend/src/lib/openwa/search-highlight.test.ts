import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSearchParams, renderHighlightedSnippet } from "./search-highlight.ts";

describe("renderHighlightedSnippet", () => {
  it("splits mark tags", () => {
    const segs = renderHighlightedSnippet("hello <mark>world</mark>");
    assert.deepEqual(segs, [{ text: "hello ", marked: false }, { text: "world", marked: true }]);
  });
});

describe("buildSearchParams", () => {
  it("returns null for blank query", () => {
    assert.equal(buildSearchParams("  "), null);
  });
});
