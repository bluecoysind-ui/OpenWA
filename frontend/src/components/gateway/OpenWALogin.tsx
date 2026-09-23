import { useEffect, useState, type FormEvent } from "react";
import Aurora from "@/components/gateway/Aurora";
import { waitForUiConnectKey } from "@/lib/openwa/uiConnect";
import { getOpenWAUrl, setOpenWACredentials } from "@/lib/openwa-config";
import { useGateway } from "@/store/gateway-store";

export function OpenWALogin() {
  const login = useGateway((s) => s.login);
  const [url, setUrl] = useState(() => getOpenWAUrl());
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = await waitForUiConnectKey();
      if (cancelled) return;
      if (key) {
        const origin = getOpenWAUrl();
        setOpenWACredentials(origin, key);
        sessionStorage.setItem("dashboard_auth", "authenticated");
        sessionStorage.setItem("dashboard_user", "operator");
        useGateway.setState({
          apiKey: key,
          user: "operator",
          serverUrl: origin,
          authNeeded: false,
        });
        await useGateway.getState().init();
        return;
      }
      if (!cancelled) setAutoConnecting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    setBusy(true);
    setError("");
    const result = await login("", "", apiKey.trim(), url.trim() || getOpenWAUrl());
    setBusy(false);
    if (!result.ok) {
      setError(
        result.message?.trim() ||
          "Could not validate that key against OpenWA. Check the URL, API key, WA_GATEWAY_URL, and CORS_ORIGINS on the API.",
      );
    }
  };

  if (autoConnecting) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden text-ink">
        <div className="app-bg">
          <Aurora />
        </div>
        <div className="glass relative z-10 w-full max-w-sm rounded-3xl p-8 text-center">
          <div className="mx-auto mb-3 size-12 overflow-hidden rounded-[12px] bg-white">
            <img src="/__grok/logo.png" alt="OpenWA" className="size-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold">Connecting to OpenWA</h1>
          <p className="mt-2 text-sm text-muted">Using the local gateway key. You do not need to paste it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden text-ink">
      <div className="app-bg">
        <Aurora />
      </div>
      <form onSubmit={onSubmit} className="glass relative z-10 w-full max-w-md rounded-3xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 size-12 overflow-hidden rounded-[12px] bg-white">
            <img src="/__grok/logo.png" alt="OpenWA" className="size-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold">Connect OpenWA</h1>
          <p className="mt-1 text-sm text-muted">Automatic connect did not find a local key. Paste an admin API key to continue.</p>
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
