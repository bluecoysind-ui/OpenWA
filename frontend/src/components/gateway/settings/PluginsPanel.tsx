import { useEffect, useRef, useState } from "react";
import { Cpu, Database, Globe, Loader2, Puzzle, Search, Server, Shield, Trash2, Upload, Zap } from "lucide-react";
import type { Plugin, PluginConfigField } from "@/lib/openwa-api";
import { pluginHealthCheck, updatePluginFromUrl } from "@/lib/openwa-api";
import { localizePlugin } from "@/lib/openwa/localizePlugin";
import { emptyForField } from "@/lib/openwa/pluginConfigForm";
import { configUiSafeConfig, missingRequiredConfig, sparseSessionOverride } from "@/lib/openwa/pluginConfigRules";
import { injectConfigUiCsp } from "@/lib/openwa/pluginFrameSecurity";
import { useAppToast } from "@/lib/openwa/useToast";
import {
  queryKeys,
  useInstallPluginFileMutation,
  useInstallPluginUrlMutation,
  usePluginCatalogQuery,
  usePluginConfigUiQuery,
  usePluginToggleMutation,
  usePluginsQuery,
  useSessionsQuery,
  useSetPluginSessionsMutation,
  useUninstallPluginMutation,
  useUpdatePluginConfigMutation,
  useUpdatePluginSessionConfigMutation,
} from "@/lib/openwa-query";
import { useQueryClient } from "@tanstack/react-query";
import { btn, danger, ErrorLine, field, ghost, Modal } from "./ui";
import { ConfigField, PluginInstances } from "./PluginInstances";

const typeIcons: Record<string, typeof Puzzle> = {
  engine: Cpu,
  storage: Database,
  queue: Server,
  auth: Shield,
  extension: Zap,
};

export function PluginsPanel() {
  const toast = useAppToast();
  const pluginsQ = usePluginsQuery();
  const toggle = usePluginToggleMutation();
  const uninstall = useUninstallPluginMutation();
  const installUrl = useInstallPluginUrlMutation();
  const installFile = useInstallPluginFileMutation();
  const [configId, setConfigId] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installMode, setInstallMode] = useState<"upload" | "url" | "catalog">("catalog");
  const [url, setUrl] = useState("");
  const [updateTarget, setUpdateTarget] = useState<Plugin | null>(null);
  const [updateUrl, setUpdateUrl] = useState("");
  const [search, setSearch] = useState("");
  const pluginLang = (typeof navigator !== "undefined" ? navigator.language : "en").split("-")[0] || "en";
  const catalogQ = usePluginCatalogQuery(showInstall && installMode === "catalog");
  const configPlugin = (pluginsQ.data ?? []).find((p) => p.id === configId) ?? null;

  const handleToggle = async (plugin: Plugin) => {
    if (plugin.status !== "enabled") {
      const missing = missingRequiredConfig(plugin);
      if (missing.length > 0) {
        toast.warning("Config required", `Fill: ${missing.join(", ")}`);
        setConfigId(plugin.id);
        return;
      }
    }
    try {
      const res = await toggle.mutateAsync({ id: plugin.id, enable: plugin.status !== "enabled" });
      if (!res.success) toast.warning("Toggle failed", res.message);
    } catch (err) {
      toast.error("Toggle failed", err instanceof Error ? err.message : "");
    }
  };

  return (
    <div className="space-y-3">
      <ErrorLine error={pluginsQ.error} />
      <div className="flex justify-end">
        <button type="button" className={btn} onClick={() => setShowInstall(true)}>
          <Upload size={14} /> Install plugin
        </button>
      </div>
      {pluginsQ.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      {(pluginsQ.data ?? []).map((raw) => {
        const p = localizePlugin(raw, pluginLang);
        const Icon = typeIcons[p.type] ?? Puzzle;
        return (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-night/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo/20 text-indigo">
                <Icon size={16} />
              </span>
              <div>
                <div className="text-sm font-medium">
                  {p.name} <span className="text-[11px] text-dim">{p.version}</span>
                </div>
                <div className="text-[11px] text-muted">
                  {p.type} · {p.status}
                  {p.description ? ` · ${p.description}` : ""}
                  {p.error ? ` · ${p.error}` : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={ghost} onClick={() => setConfigId(p.id)}>
                Configure
              </button>
              {!p.builtIn ? (
                <button type="button" className={ghost} onClick={() => { setUpdateTarget(p); setUpdateUrl(""); }}>
                  Update URL
                </button>
              ) : null}
              <button
                type="button"
                className={ghost}
                onClick={() =>
                  void pluginHealthCheck(p.id).then((r) =>
                    r.healthy ? toast.success("Healthy", r.message) : toast.warning("Unhealthy", r.message),
                  )
                }
              >
                Health
              </button>
              <button type="button" className={p.status === "enabled" ? ghost : btn} disabled={toggle.isPending || p.builtIn} onClick={() => void handleToggle(p)}>
                {p.status === "enabled" ? "Disable" : "Enable"}
              </button>
              {!p.builtIn ? (
                <button type="button" className={danger} onClick={() => { if (window.confirm(`Uninstall ${p.name}?`)) uninstall.mutate(p.id); }}>
                  <Trash2 size={12} />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {configPlugin ? <PluginConfigModal plugin={localizePlugin(configPlugin, pluginLang)} onClose={() => setConfigId(null)} /> : null}

      <Modal open={Boolean(updateTarget)} title={`Update ${updateTarget?.name ?? "plugin"}`} onClose={() => setUpdateTarget(null)}>
        <input className={field} value={updateUrl} onChange={(e) => setUpdateUrl(e.target.value)} placeholder="https://…/plugin.zip" />
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={!updateTarget || !updateUrl.trim()}
          onClick={() => {
            if (!updateTarget) return;
            void updatePluginFromUrl(updateTarget.id, updateUrl.trim())
              .then(() => {
                toast.success("Plugin updated");
                setUpdateTarget(null);
                void pluginsQ.refetch();
              })
              .catch((err: unknown) => toast.error("Update failed", err instanceof Error ? err.message : ""));
          }}
        >
          Update from URL
        </button>
      </Modal>

      <Modal open={showInstall} title="Install plugin" onClose={() => setShowInstall(false)} wide>
        <div className="mb-3 flex gap-1">
          {(["catalog", "url", "upload"] as const).map((mode) => (
            <button key={mode} type="button" className={installMode === mode ? btn : ghost} onClick={() => setInstallMode(mode)}>
              {mode}
            </button>
          ))}
        </div>
        {installMode === "url" ? (
          <div className="flex gap-2">
            <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/plugin.zip" />
            <button
              type="button"
              className={btn}
              disabled={!url || installUrl.isPending}
              onClick={() =>
                installUrl
                  .mutateAsync(url)
                  .then(() => {
                    toast.success("Installed");
                    setShowInstall(false);
                  })
                  .catch((err: unknown) => toast.error("Install failed", err instanceof Error ? err.message : ""))
              }
            >
              <Globe size={14} /> Install
            </button>
          </div>
        ) : null}
        {installMode === "upload" ? (
          <label className={ghost}>
            <Upload size={14} /> Choose .zip
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void installFile
                  .mutateAsync(file)
                  .then(() => {
                    toast.success("Installed");
                    setShowInstall(false);
                  })
                  .catch((err: unknown) => toast.error("Install failed", err instanceof Error ? err.message : ""));
              }}
            />
          </label>
        ) : null}
        {installMode === "catalog" ? (
          <div>
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute top-2.5 left-3 text-muted" />
              <input className={`${field} pl-8`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog" />
            </div>
            <ErrorLine error={catalogQ.error} />
            {catalogQ.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
            {(catalogQ.data ?? [])
              .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
                <div key={c.id} className="mb-2 flex items-center justify-between rounded-xl border border-line px-3 py-2">
                  <div>
                    <div className="text-sm">{c.name}</div>
                    <div className="text-[11px] text-muted">
                      {c.version} {c.installed ? "· installed" : ""} {c.updateAvailable ? "· update available" : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btn}
                    disabled={!c.download || installUrl.isPending}
                    onClick={() => {
                      if (!c.download) return;
                      void installUrl
                        .mutateAsync(c.download)
                        .then(() => toast.success(c.installed ? "Updated" : "Installed"))
                        .catch((err: unknown) => toast.error("Install failed", err instanceof Error ? err.message : ""));
                    }}
                  >
                    {c.installed ? "Update" : "Install"}
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function PluginConfigModal({ plugin, onClose }: { plugin: Plugin; onClose: () => void }) {
  const toast = useAppToast();
  const saveConfig = useUpdatePluginConfigMutation();
  const [tab, setTab] = useState<"config" | "sessions" | "instances">("config");
  const [schemaConfig, setSchemaConfig] = useState<Record<string, unknown>>(() => seedConfig(plugin));
  const formRef = useRef<HTMLFormElement>(null);
  const hasSchema = !!plugin.configSchema && Object.keys(plugin.configSchema.properties).length > 0;
  const hasUi = !!plugin.configUi;
  const showInstances = Boolean(plugin.ingressCapable);

  const save = async () => {
    if (formRef.current && !formRef.current.reportValidity()) return;
    try {
      const res = await saveConfig.mutateAsync({ id: plugin.id, config: schemaConfig });
      if (!res.success) throw new Error(res.message);
      toast.success("Saved");
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open title={`${plugin.name} config`} onClose={onClose} wide>
      <div className="mb-3 flex gap-1">
        {(["config", ...(plugin.sessionScoped ? (["sessions"] as const) : []), ...(showInstances ? (["instances"] as const) : [])] as const).map((t) => (
          <button key={t} type="button" className={tab === t ? btn : ghost} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "config" ? (
        hasUi ? (
          <PluginConfigUi plugin={plugin} />
        ) : hasSchema ? (
          <form ref={formRef} className="space-y-2" onSubmit={(e) => e.preventDefault()}>
            {Object.entries(plugin.configSchema!.properties).map(([key, def]) => (
              <ConfigField key={key} fieldDef={def} label={def.title || key} value={schemaConfig[key]} onChange={(v) => setSchemaConfig({ ...schemaConfig, [key]: v })} />
            ))}
            <button type="button" className={btn} disabled={saveConfig.isPending} onClick={() => void save()}>
              Save
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">This plugin has no configurable fields.</p>
        )
      ) : null}
      {tab === "sessions" ? <SessionsTab plugin={plugin} /> : null}
      {tab === "instances" ? <PluginInstances pluginId={plugin.id} /> : null}
    </Modal>
  );
}

function seedConfig(plugin: Plugin): Record<string, unknown> {
  const props = plugin.configSchema?.properties ?? {};
  const seeded: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    seeded[key] = plugin.config?.[key] ?? emptyForField(def);
  }
  return seeded;
}

function PluginConfigUi({ plugin, sessionId }: { plugin: Plugin; sessionId?: string }) {
  const toast = useAppToast();
  const qc = useQueryClient();
  const htmlQ = usePluginConfigUiQuery(plugin.id, true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [handshake, setHandshake] = useState(false);
  const saveConfig = useUpdatePluginConfigMutation();
  const saveSession = useUpdatePluginSessionConfigMutation();

  const srcDoc = htmlQ.data
    ? harden(htmlQ.data)
    : "";

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame || e.source !== frame) return;
      const msg = e.data as { type?: string; config?: Record<string, unknown> };
      const post = (m: unknown) => frame.postMessage(m, "*");
      if (msg?.type === "config:get") {
        setHandshake(true);
        post({ type: "config:value", config: configUiSafeConfig(plugin, sessionId), schema: plugin.configSchema, theme: "dark" });
      } else if (msg?.type === "config:save") {
        void (async () => {
          try {
            const res = sessionId
              ? await saveSession.mutateAsync({ id: plugin.id, sessionId, config: sparseSessionOverride(msg.config ?? {}, plugin) })
              : await saveConfig.mutateAsync({ id: plugin.id, config: msg.config ?? {} });
            if (!res.success) throw new Error(res.message);
            void qc.invalidateQueries({ queryKey: queryKeys.plugins });
            post({ type: "config:saved" });
            toast.success("Saved");
          } catch (err) {
            const message = err instanceof Error ? err.message : "Save failed";
            post({ type: "config:error", message });
            toast.error("Save failed", message);
          }
        })();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [plugin, sessionId, qc, toast, saveConfig, saveSession]);

  if (htmlQ.isLoading) return <Loader2 className="animate-spin text-muted" />;
  if (htmlQ.isError) return <ErrorLine error={htmlQ.error} />;
  return (
    <>
      {!handshake ? <p className="mb-2 text-[11px] text-muted">Waiting for editor handshake…</p> : null}
      <iframe ref={iframeRef} sandbox="allow-scripts" srcDoc={srcDoc} title={plugin.name} className="w-full rounded-xl border border-line bg-white" style={{ height: plugin.configUi?.height ?? 600 }} />
    </>
  );
}

function harden(source: string): string {
  const nonce = document.querySelector<HTMLMetaElement>('meta[name="openwa-csp-nonce"]')?.content ?? "";
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (nonce && nonce !== "__OPENWA_CSP_NONCE__") {
    for (const script of doc.querySelectorAll("script:not([src])")) script.setAttribute("nonce", nonce);
  }
  injectConfigUiCsp(doc);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function SessionsTab({ plugin }: { plugin: Plugin }) {
  const toast = useAppToast();
  const sessions = useSessionsQuery();
  const setSessions = useSetPluginSessionsMutation();
  const saveOverride = useUpdatePluginSessionConfigMutation();
  const [mode, setMode] = useState<"all" | "specific">(plugin.activeSessions?.includes("*") ? "all" : "specific");
  const [picked, setPicked] = useState<Set<string>>(new Set((plugin.activeSessions ?? []).filter((s) => s !== "*")));
  const [selSession, setSelSession] = useState("");
  const [overrideCfg, setOverrideCfg] = useState<Record<string, unknown>>({});
  const props = plugin.configSchema?.properties ?? {};

  useEffect(() => {
    if (!selSession || !plugin.configSchema?.properties) {
      setOverrideCfg({});
      return;
    }
    const ov = plugin.sessionConfig?.[selSession] ?? {};
    const seeded: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(plugin.configSchema.properties)) {
      seeded[key] = key in ov ? ov[key] : (plugin.config?.[key] ?? emptyForField(def));
    }
    setOverrideCfg(seeded);
  }, [selSession, plugin.id, plugin.configSchema, plugin.config, plugin.sessionConfig]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm">Activation</p>
        <label className="mr-4 text-sm">
          <input type="radio" checked={mode === "all"} onChange={() => setMode("all")} /> All sessions
        </label>
        <label className="text-sm">
          <input type="radio" checked={mode === "specific"} onChange={() => setMode("specific")} /> Selected sessions
        </label>
        {mode === "specific" ? (
          <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-line p-2">
            {(sessions.data ?? []).map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={picked.has(s.id)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    setPicked(next);
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={setSessions.isPending}
          onClick={() =>
            setSessions
              .mutateAsync({ id: plugin.id, sessions: mode === "all" ? ["*"] : Array.from(picked) })
              .then(() => toast.success("Activation saved"))
              .catch((err: unknown) => toast.error("Save failed", err instanceof Error ? err.message : ""))
          }
        >
          Save activation
        </button>
      </div>
      {plugin.configSchema ? (
        <div>
          <p className="mb-2 text-sm">Per-session override</p>
          <select className={field} value={selSession} onChange={(e) => setSelSession(e.target.value)}>
            <option value="">Select session</option>
            {(sessions.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {Object.keys(plugin.sessionConfig?.[s.id] ?? {}).length ? " ●" : ""}
              </option>
            ))}
          </select>
          {selSession && plugin.configUi ? <PluginConfigUi key={selSession} plugin={plugin} sessionId={selSession} /> : null}
          {selSession && !plugin.configUi ? (
            <div className="mt-2 space-y-2">
              {Object.entries(props).map(([key, def]: [string, PluginConfigField]) => (
                <ConfigField key={key} fieldDef={def} label={def.title || key} value={overrideCfg[key]} onChange={(v) => setOverrideCfg({ ...overrideCfg, [key]: v })} />
              ))}
              <div className="flex gap-2">
                <button type="button" className={ghost} onClick={() => void saveOverride.mutateAsync({ id: plugin.id, sessionId: selSession, config: {} }).then(() => toast.success("Override cleared"))}>
                  Clear
                </button>
                <button type="button" className={btn} onClick={() => void saveOverride.mutateAsync({ id: plugin.id, sessionId: selSession, config: sparseSessionOverride(overrideCfg, plugin) }).then(() => toast.success("Override saved"))}>
                  Save override
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
