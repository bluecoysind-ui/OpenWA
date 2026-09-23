/** Same-origin bootstrap so the UI can connect without pasting data/.api-key. */

export async function fetchUiConnectKey(fetcher: typeof fetch = fetch): Promise<string> {
  try {
    const res = await fetcher("/api/auth/ui-connect", { headers: { Accept: "application/json" } });
    if (!res.ok) return "";
    const body = (await res.json()) as { apiKey?: unknown };
    return typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  } catch {
    return "";
  }
}

export async function waitForUiConnectKey(opts: {
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  fetchKey?: () => Promise<string>;
} = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = opts.now ?? Date.now;
  const fetchKey = opts.fetchKey ?? fetchUiConnectKey;
  const start = now();
  let delay = 250;
  while (true) {
    const key = await fetchKey();
    if (key) return key;
    if (now() - start >= timeoutMs) return "";
    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.5), 2000);
  }
}
