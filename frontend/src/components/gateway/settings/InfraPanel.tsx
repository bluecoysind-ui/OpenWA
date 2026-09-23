import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Loader2,
  Save,
  Server,
  Upload,
} from "lucide-react";
import { exportStorageArchive, importStorageArchive } from "@/lib/openwa/extended-api";
import { getOpenWAApiBase } from "@/lib/openwa-config";
import { copyToClipboard } from "@/lib/openwa/clipboard";
import { useConfigSave } from "@/lib/openwa/useConfigSave";
import { useDataBackup } from "@/lib/openwa/useDataBackup";
import { useInfraConfigForm } from "@/lib/openwa/useInfraConfigForm";
import { useRestartFlow } from "@/lib/openwa/useRestartFlow";
import { useAppToast } from "@/lib/openwa/useToast";
import { useCurrentEngineQuery, useEnginesQuery, useInfraConfigQuery, useInfraQuery } from "@/lib/openwa-query";
import { btn, Card, ErrorLine, field, ghost, Modal, Toggle } from "./ui";

export function InfraPanel() {
  const toast = useAppToast();
  const statusQ = useInfraQuery();
  const configQ = useInfraConfigQuery();
  const enginesQ = useEnginesQuery();
  const currentEngineQ = useCurrentEngineQuery();
  const infraStatus = statusQ.data;
  const savedConfig = configQ.data;
  const configForm = useInfraConfigForm(infraStatus, savedConfig);
  const restartFlow = useRestartFlow();
  const dataBackup = useDataBackup();
  const configSave = useConfigSave({
    buildPayload: configForm.buildSavePayload,
    onSaved: (profiles) => {
      const dbExternalRetarget =
        configForm.dbConfig.type === "postgres" &&
        !configForm.dbConfig.builtIn &&
        !!savedConfig &&
        (configForm.dbConfig.host !== savedConfig.database.host ||
          configForm.dbConfig.port !== savedConfig.database.port ||
          configForm.dbConfig.database !== savedConfig.database.database);
      const dbSwitch =
        !!infraStatus &&
        (configForm.dbConfig.type !== infraStatus.database.type ||
          (configForm.dbConfig.type === "postgres" && configForm.dbConfig.builtIn !== infraStatus.database.builtIn) ||
          dbExternalRetarget);
      const storageSwitch =
        !!infraStatus &&
        (configForm.storageConfig.type !== infraStatus.storage.type ||
          (configForm.storageConfig.type === "s3" && configForm.storageConfig.builtIn !== infraStatus.storage.builtIn));
      restartFlow.open({ profiles, dbSwitch, storageSwitch });
    },
  });
  const [queueStats, setQueueStats] = useState({ pending: 0, completed: 0, failed: 0 });
  const [storageBusy, setStorageBusy] = useState(false);
  const currentEngine = currentEngineQ.data?.engineType ?? "";

  const exportStorage = async () => {
    setStorageBusy(true);
    try {
      const blob = await exportStorageArchive();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openwa-storage-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Storage archive exported");
    } catch (err) {
      toast.error("Export failed", err instanceof Error ? err.message : "");
    } finally {
      setStorageBusy(false);
    }
  };

  const importStorage = async (file: File) => {
    setStorageBusy(true);
    try {
      const res = await importStorageArchive(file);
      toast.success(res.message ?? "Storage imported");
    } catch (err) {
      toast.error("Import failed", err instanceof Error ? err.message : "");
    } finally {
      setStorageBusy(false);
    }
  };

  useEffect(() => {
    if (!infraStatus) return;
    configForm.setRedisConnected(infraStatus.redis.connected);
    setQueueStats(infraStatus.queue.webhooks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infraStatus]);

  if (statusQ.isLoading) return <Loader2 className="animate-spin text-muted" />;
  if (statusQ.isError || !infraStatus) {
    return (
      <Card title="Infrastructure" sub="Live status from GET /api/infra/status">
        <ErrorLine error={statusQ.error ?? new Error("Could not load infrastructure status")} />
        <button type="button" className={ghost} onClick={() => void statusQ.refetch()}>
          Retry
        </button>
      </Card>
    );
  }

  const settingNote = (envKey: string, running: unknown, saved: unknown) => {
    if (infraStatus.envPinned?.includes(envKey)) {
      return (
        <p className="mb-3 flex items-center gap-1 text-[11px] text-amber-300">
          <AlertTriangle size={14} /> {envKey} is pinned by the environment and cannot be changed here.
        </p>
      );
    }
    const pendingRestart = !configSave.saving && !!savedConfig && running !== saved;
    return pendingRestart ? (
      <p className="mb-3 flex items-center gap-1 text-[11px] text-amber-300">
        <AlertTriangle size={14} /> Saved — restart the gateway to apply this change.
      </p>
    ) : null;
  };

  const s3Unreachable = configForm.storageConfig.type === "s3" && infraStatus.storage.s3Available === false;

  return (
    <div className="space-y-3">
      <ErrorLine error={statusQ.error ?? configQ.error} />

      <Card
        title="Database"
        sub={configForm.dbConfig.type === "postgres" ? "PostgreSQL" : "SQLite"}
        actions={
          <span className="text-[11px] text-wa">{infraStatus.database.connected ? "connected" : "offline"}</span>
        }
      >
        {settingNote("DATABASE_TYPE", infraStatus.database.type, savedConfig?.database.type)}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {(["sqlite", "postgres"] as const).map((type) => (
            <label
              key={type}
              className={`cursor-pointer rounded-xl border p-3 ${configForm.dbConfig.type === type ? "border-wa/50 bg-wa/10" : "border-line"}`}
            >
              <input
                type="radio"
                className="mr-2"
                checked={configForm.dbConfig.type === type}
                onChange={() => configForm.updateDbConfig("type", type)}
              />
              {type === "sqlite" ? "SQLite (file)" : "PostgreSQL"}
            </label>
          ))}
        </div>
        {configForm.dbConfig.type === "postgres" ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm">Use built-in Postgres</div>
                <div className="text-[11px] text-muted">OpenWA-managed container</div>
              </div>
              <Toggle checked={configForm.dbConfig.builtIn} onChange={(v) => configForm.updateDbConfig("builtIn", v)} />
            </div>
            {!configForm.dbConfig.builtIn ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={field} value={configForm.dbConfig.host} onChange={(e) => configForm.updateDbConfig("host", e.target.value)} placeholder="Host" />
                <input className={field} value={configForm.dbConfig.port} onChange={(e) => configForm.updateDbConfig("port", e.target.value)} placeholder="Port" />
                <input className={field} value={configForm.dbConfig.username} onChange={(e) => configForm.updateDbConfig("username", e.target.value)} placeholder="Username" />
                <input className={field} type="password" value={configForm.dbConfig.password} onChange={(e) => configForm.updateDbConfig("password", e.target.value)} placeholder="Password (blank keeps current)" />
                <input className={field} value={configForm.dbConfig.database} onChange={(e) => configForm.updateDbConfig("database", e.target.value)} placeholder="Database" />
                <input className={field} type="number" value={configForm.dbConfig.poolSize} onChange={(e) => configForm.updateDbConfig("poolSize", parseInt(e.target.value))} placeholder="Pool size" />
                <input className={field} value={configForm.dbConfig.schema} onChange={(e) => configForm.updateDbConfig("schema", e.target.value)} placeholder="Schema" />
                <div className="flex items-center justify-between rounded-xl border border-line px-3">
                  <span className="text-sm">SSL</span>
                  <Toggle checked={configForm.dbConfig.sslEnabled} onChange={(v) => configForm.updateDbConfig("sslEnabled", v)} />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="mt-3 flex items-center gap-2 text-[12px] text-wa">
          <CheckCircle size={14} /> Migrations applied automatically
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={ghost} disabled={dataBackup.migrating} onClick={() => void dataBackup.exportBackup()}>
            {dataBackup.migrating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export backup
          </button>
          <label className={ghost}>
            <Upload size={14} /> Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={dataBackup.migrating}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void dataBackup.importBackup(file);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className={ghost} disabled={storageBusy} onClick={() => void exportStorage()}>
            {storageBusy ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />} Export storage ZIP
          </button>
          <label className={ghost}>
            <Upload size={14} /> Import storage ZIP
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              disabled={storageBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importStorage(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </Card>

      <Card title="WhatsApp engine" sub={currentEngine || configForm.engineConfig.type}>
        {settingNote("ENGINE_TYPE", infraStatus.engine.type, savedConfig?.engine.type)}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {(enginesQ.data ?? []).map((engine) => (
            <label
              key={engine.id}
              className={`cursor-pointer rounded-xl border p-3 ${configForm.engineConfig.type === engine.id ? "border-wa/50 bg-wa/10" : "border-line"}`}
            >
              <input
                type="radio"
                className="mr-2"
                checked={configForm.engineConfig.type === engine.id}
                onChange={() => configForm.updateEngineConfig("type", engine.id)}
              />
              <span className="font-medium">{engine.name}</span>
              <div className="text-[11px] text-muted">{engine.library ? `${engine.library.name} ${engine.library.version}` : "Built-in"}</div>
            </label>
          ))}
        </div>
        {infraStatus.engine.webVersion !== undefined ? (
          <p className="mb-3 text-[11px] text-muted">
            WhatsApp Web: <code>{infraStatus.engine.webVersion ?? "native"}</code>
            {infraStatus.engine.webVersionSource ? ` (${infraStatus.engine.webVersionSource})` : ""}
          </p>
        ) : null}
        {configForm.engineConfig.type === "whatsapp-web.js" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Headless browser</span>
              <Toggle checked={configForm.engineConfig.headless} onChange={(v) => configForm.updateEngineConfig("headless", v)} />
            </div>
            <input className={field} value={configForm.engineConfig.sessionDataPath} onChange={(e) => configForm.updateEngineConfig("sessionDataPath", e.target.value)} placeholder="Session data path" />
            <input className={field} value={configForm.engineConfig.browserArgs} onChange={(e) => configForm.updateEngineConfig("browserArgs", e.target.value)} placeholder="Browser args" />
          </div>
        ) : (
          <p className="text-[11px] text-muted">This engine does not launch a browser.</p>
        )}
      </Card>

      <Card
        title="Redis"
        sub={
          configForm.redisEnabled
            ? configForm.redisConfig.connected
              ? "Connected"
              : "Disconnected"
            : "Disabled"
        }
      >
        {settingNote("REDIS_ENABLED", infraStatus.redis.enabled, savedConfig?.redis.enabled)}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm">Enable Redis</div>
            <div className="text-[11px] text-muted">Required for webhook queues</div>
          </div>
          <Toggle checked={configForm.redisEnabled} onChange={configForm.setRedisEnabled} />
        </div>
        {configForm.redisEnabled ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm">Use built-in Redis</span>
              <Toggle checked={configForm.redisConfig.builtIn} onChange={(v) => configForm.updateRedisConfig("builtIn", v)} />
            </div>
            {!configForm.redisConfig.builtIn ? (
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <input className={field} value={configForm.redisConfig.host} onChange={(e) => configForm.updateRedisConfig("host", e.target.value)} placeholder="Host" />
                <input className={field} value={configForm.redisConfig.port} onChange={(e) => configForm.updateRedisConfig("port", e.target.value)} placeholder="Port" />
                <input className={field} type="password" value={configForm.redisConfig.password} onChange={(e) => configForm.updateRedisConfig("password", e.target.value)} placeholder="Password (optional)" />
              </div>
            ) : null}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm">Webhook queue</span>
              <Toggle checked={configForm.queueEnabled} onChange={configForm.setQueueEnabled} />
            </div>
            {configForm.queueEnabled ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-line p-2">
                  <div className="text-lg font-semibold">{queueStats.pending}</div>
                  <div className="text-[10px] text-muted">Pending</div>
                </div>
                <div className="rounded-xl border border-line p-2">
                  <div className="text-lg font-semibold">{queueStats.completed.toLocaleString()}</div>
                  <div className="text-[10px] text-muted">Completed</div>
                </div>
                <div className="rounded-xl border border-line p-2">
                  <div className="text-lg font-semibold text-danger">{queueStats.failed}</div>
                  <div className="text-[10px] text-muted">Failed</div>
                </div>
                <button
                  type="button"
                  className={`${ghost} col-span-3`}
                  onClick={() => {
                    void copyToClipboard(`${getOpenWAApiBase()}/admin/queues`).then((ok) => {
                      if (ok) toast.success("BullMQ URL copied", "Open it with an authenticated client.");
                    });
                  }}
                >
                  <ExternalLink size={14} /> Copy BullMQ admin URL
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] text-muted">Redis is optional. Enable it for durable webhook delivery.</p>
        )}
      </Card>

      <Card title="Storage" sub={configForm.storageConfig.type === "s3" ? (s3Unreachable ? "S3 unreachable" : "S3") : "Local disk"}>
        {settingNote("STORAGE_TYPE", infraStatus.storage.type, savedConfig?.storage.type)}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {(["local", "s3"] as const).map((type) => (
            <label
              key={type}
              className={`cursor-pointer rounded-xl border p-3 ${configForm.storageConfig.type === type ? "border-wa/50 bg-wa/10" : "border-line"}`}
            >
              <input type="radio" className="mr-2" checked={configForm.storageConfig.type === type} onChange={() => configForm.updateStorageConfig("type", type)} />
              {type === "local" ? "Local folder" : "S3 / MinIO"}
            </label>
          ))}
        </div>
        {configForm.storageConfig.type === "local" ? (
          <input className={field} value={configForm.storageConfig.localPath} onChange={(e) => configForm.updateStorageConfig("localPath", e.target.value)} placeholder="Storage path" />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm">Use built-in MinIO</span>
              <Toggle checked={configForm.storageConfig.builtIn} onChange={(v) => configForm.updateStorageConfig("builtIn", v)} />
            </div>
            {!configForm.storageConfig.builtIn ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={field} value={configForm.storageConfig.s3Bucket} onChange={(e) => configForm.updateStorageConfig("s3Bucket", e.target.value)} placeholder="Bucket" />
                <input className={field} value={configForm.storageConfig.s3Region} onChange={(e) => configForm.updateStorageConfig("s3Region", e.target.value)} placeholder="Region" />
                <input className={field} value={configForm.storageConfig.s3AccessKey} onChange={(e) => configForm.updateStorageConfig("s3AccessKey", e.target.value)} placeholder="Access key" />
                <input className={field} type="password" value={configForm.storageConfig.s3SecretKey} onChange={(e) => configForm.updateStorageConfig("s3SecretKey", e.target.value)} placeholder="Secret key" />
                <input className={`${field} sm:col-span-2`} value={configForm.storageConfig.s3Endpoint} onChange={(e) => configForm.updateStorageConfig("s3Endpoint", e.target.value)} placeholder="Endpoint (optional)" />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <button type="button" className={`${btn} w-full py-3 text-sm`} disabled={configSave.saving} onClick={() => void configSave.saveConfig()}>
        {configSave.saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {configSave.saving ? "Saving…" : "Save configuration"}
      </button>

      <Modal
        open={restartFlow.showRestartModal}
        title={
          restartFlow.restartStatus === "idle"
            ? "Restart gateway?"
            : restartFlow.restartStatus === "success"
              ? "Restarted"
              : restartFlow.restartStatus === "error"
                ? "Restart failed"
                : "Restarting…"
        }
        onClose={restartFlow.close}
      >
        {restartFlow.restartStatus === "idle" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Apply the saved config by restarting OpenWA. Sessions reconnect automatically after the process comes back.</p>
            {(restartFlow.dbSwitch || restartFlow.storageSwitch) ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
                <AlertTriangle size={16} className="mb-1 inline" /> Switching backends starts empty.
                {restartFlow.dbSwitch ? <p>Export a backup before restarting if you need the current database.</p> : null}
                {restartFlow.dbSwitch ? (
                  <button type="button" className={`${ghost} mt-2`} disabled={dataBackup.migrating} onClick={() => void dataBackup.exportBackup()}>
                    Download backup
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={ghost} onClick={restartFlow.close}>
                Later
              </button>
              <button type="button" className={btn} onClick={() => void restartFlow.start()}>
                Restart now
              </button>
            </div>
          </div>
        ) : null}
        {restartFlow.restartStatus === "restarting" || restartFlow.restartStatus === "waiting" ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto mb-3 animate-spin" size={36} />
            <p className="text-sm">
              {restartFlow.restartCountdown > 0 ? `Restarting… ${restartFlow.restartCountdown}s` : "Checking readiness…"}
            </p>
            <p className="mt-2 text-[11px] text-muted">Do not close this tab.</p>
          </div>
        ) : null}
        {restartFlow.restartStatus === "success" ? (
          <p className="py-4 text-center text-wa">Gateway is ready. Reloading…</p>
        ) : null}
        {restartFlow.restartStatus === "error" ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-danger">The gateway did not become ready in time.</p>
            <button type="button" className={btn} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
