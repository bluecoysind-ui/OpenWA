import { useEffect, useState } from "react";
import {
  getAppSettings,
  getMetricsText,
  listCalls,
  listCatalogProducts,
  sendCatalogProduct,
} from "@/lib/openwa-api";
import { useSessionsQuery } from "@/lib/openwa-query";
import { useAppToast } from "@/lib/openwa/useToast";
import { Card, ErrorLine, btn, field, ghost } from "./ui";
import { SessionSelect } from "../akg/akg-ui";

export function CatalogPanel() {
  const sessions = useSessionsQuery();
  const [sessionId, setSessionId] = useState("");
  const [products, setProducts] = useState<unknown[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [chatId, setChatId] = useState("");
  const [productId, setProductId] = useState("");
  const toast = useAppToast();
  const sid = sessionId || sessions.data?.[0]?.id || "";

  useEffect(() => {
    if (!sid) return;
    void listCatalogProducts(sid)
      .then(setProducts)
      .catch(setError);
  }, [sid]);

  return (
    <div className="space-y-3">
      <AkgError error={error} />
      <Card title="Catalog" sub="List products and send one into a chat">
        <SessionSelect value={sid} onChange={setSessionId} sessions={sessions.data ?? []} />
        <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-night/40 p-2 text-[11px] text-muted">
          {JSON.stringify(products, null, 2)}
        </pre>
        <input className={`${field} mt-2`} value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="chatId" />
        <input className={`${field} mt-2`} value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="productId" />
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={!sid || !chatId || !productId}
          onClick={() =>
            void sendCatalogProduct(sid, { chatId, productId })
              .then(() => toast.success("Product sent"))
              .catch(setError)
          }
        >
          Send product
        </button>
      </Card>
    </div>
  );
}

export function CallsPanel() {
  const sessions = useSessionsQuery();
  const [sessionId, setSessionId] = useState("");
  const [calls, setCalls] = useState<unknown[]>([]);
  const [error, setError] = useState<unknown>(null);
  const sid = sessionId || sessions.data?.[0]?.id || "";

  useEffect(() => {
    if (!sid) return;
    void listCalls(sid).then(setCalls).catch(setError);
  }, [sid]);

  return (
    <div className="space-y-3">
      <AkgError error={error} />
      <Card title="Calls" sub="Recent call events from the engine">
        <SessionSelect value={sid} onChange={setSessionId} sessions={sessions.data ?? []} />
        <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-night/40 p-2 text-[11px] text-muted">
          {JSON.stringify(calls, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

export function SystemPanel() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState("");
  const [error, setError] = useState<unknown>(null);

  const load = () => {
    setError(null);
    void getAppSettings()
      .then(setSettings)
      .catch(setError);
    void getMetricsText()
      .then(setMetrics)
      .catch(() => setMetrics(""));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3">
      <AkgError error={error} />
      <div className="flex gap-2">
        <button type="button" className={ghost} onClick={load}>Refresh</button>
      </div>
      <Card title="App settings" sub="GET /api/settings">
        <pre className="max-h-48 overflow-auto rounded-xl bg-night/40 p-2 text-[11px] text-muted">
          {settings ? JSON.stringify(settings, null, 2) : "—"}
        </pre>
      </Card>
      <Card title="Metrics" sub="GET /api/metrics (Prometheus text)">
        <pre className="max-h-64 overflow-auto rounded-xl bg-night/40 p-2 text-[10px] text-muted whitespace-pre-wrap">
          {metrics || "—"}
        </pre>
      </Card>
    </div>
  );
}

function AkgError({ error }: { error: unknown }) {
  if (!error) return null;
  return <ErrorLine error={error instanceof Error ? error : new Error(String(error))} />;
}
