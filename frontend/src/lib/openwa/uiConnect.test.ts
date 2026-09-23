import assert from "node:assert/strict";
import test from "node:test";
import { fetchUiConnectKey, waitForUiConnectKey } from "./uiConnect.ts";

test("fetchUiConnectKey reads apiKey from a 200 body", async () => {
  const fetcher = (async () =>
    new Response(JSON.stringify({ apiKey: " owa_k1_abc " }), { status: 200 })) as typeof fetch;
  assert.equal(await fetchUiConnectKey(fetcher), "owa_k1_abc");
});

test("fetchUiConnectKey is empty on 404 or network failure", async () => {
  const missing = (async () => new Response("{}", { status: 404 })) as typeof fetch;
  assert.equal(await fetchUiConnectKey(missing), "");
  const boom = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  assert.equal(await fetchUiConnectKey(boom), "");
});

test("waitForUiConnectKey retries until a key appears", async () => {
  let n = 0;
  const key = await waitForUiConnectKey({
    timeoutMs: 5_000,
    now: () => n,
    sleep: async () => {
      n += 1;
    },
    fetchKey: async () => {
      n += 1;
      return n >= 3 ? "owa_k1_ready" : "";
    },
  });
  assert.equal(key, "owa_k1_ready");
});
