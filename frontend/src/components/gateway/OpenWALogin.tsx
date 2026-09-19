import { useState, type FormEvent } from "react";
import Aurora from "@/components/gateway/Aurora";
import { getOpenWAUrl } from "@/lib/openwa-config";
import { useGateway } from "@/store/gateway-store";

export function OpenWALogin() {
  const login = useGateway((s) => s.login);
  const [url, setUrl] = useState(() => getOpenWAUrl());
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    setBusy(true);
    setError("");
    const ok = await login("operator", "", apiKey.trim(), url.trim() || "http://localhost:2785");
    setBusy(false);
    if (!ok) setError("Could not validate that key against OpenWA. Check the URL and key.");
  };

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden text-ink">
      <div className="app-bg">
        <Aurora colorStops={["#f8a66d", "#B497CF", "#5227FF"]} blend={0.5} amplitude={1} speed={0.5} />
      </div>
      <form onSubmit={onSubmit} className="glass relative z-10 w-full max-w-md rounded-3xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 size-12 overflow-hidden rounded-[12px] bg-white shadow-[0_4px_12px_rgba(37,211,102,0.35)]">
            <img src="/__grok/logo.png" alt="OpenWA" className="size-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold">Connect OpenWA</h1>
          <p className="mt-1 text-sm text-muted">Enter the gateway URL and an admin API key to continue.</p>
        </div>
        <label className="mb-3 block text-left text-xs text-muted">
          Server URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:2785"
            className="mt-1 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-sm text-ink outline-none"
          />
        </label>
        <label className="mb-4 block text-left text-xs text-muted">
          API key
          <span className="relative mt-1 flex">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="owa_k1_…"
              className="w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 pr-16 text-sm text-ink outline-none"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-indigo"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-wa py-2.5 text-sm font-semibold text-night disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect"}
        </button>
        <p className="mt-4 text-center text-[11px] text-dim">
          First-boot key is in <code className="text-muted">data/.api-key</code> on the OpenWA server.
        </p>
      </form>
    </div>
  );
}
