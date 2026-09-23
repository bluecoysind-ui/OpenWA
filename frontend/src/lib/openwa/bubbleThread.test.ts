import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyMessageAck, applyMessageEdit, mergeDeliveryStatus, mergeIncomingBubble } from "./bubbleThread.ts";

describe("mergeDeliveryStatus", () => {
  it("never downgrades read to sent", () => {
    assert.equal(mergeDeliveryStatus("read", "sent"), "read");
  });
});

describe("mergeIncomingBubble", () => {
  it("dedupes by waMessageId", () => {
    const list = mergeIncomingBubble(
      [{ id: "a", kind: "text", from: "me", text: "hi", time: "1", waMessageId: "wa1", deliveryStatus: "sent" }],
      { id: "wa1", kind: "text", from: "me", text: "hi", time: "2", waMessageId: "wa1", deliveryStatus: "delivered" },
    );
    assert.equal(list.length, 1);
    assert.equal(list[0].kind === "text" && list[0].deliveryStatus, "delivered");
  });
});

describe("applyMessageAck", () => {
  it("updates matching bubble", () => {
    const next = applyMessageAck(
      [{ id: "x", kind: "text", from: "me", text: "t", time: "1", waMessageId: "wa" }],
      { id: "wa", messageId: "wa" },
      "read",
    );
    assert.equal(next[0].kind === "text" && next[0].deliveryStatus, "read");
  });
});

describe("applyMessageEdit", () => {
  it("replaces the body of the matching bubble", () => {
    const next = applyMessageEdit(
      [{ id: "x", kind: "text", from: "them", text: "old", time: "1", waMessageId: "wa" }],
      { messageId: "wa", body: "new" },
    );
    assert.equal(next[0].kind === "text" && next[0].text, "new");
  });
});
