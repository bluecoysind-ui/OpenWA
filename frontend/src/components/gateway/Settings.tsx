import {
  Activity,
  KeyRound,
  Puzzle,
  ScrollText,
  Send,
  Server,
  FileText,
  Smartphone,
  Webhook,
} from "lucide-react";
import { useGateway, type SettingsPanel } from "@/store/gateway-store";
import { ghost } from "./settings/ui";
import { OverviewPanel } from "./settings/OverviewPanel";
import { SessionsPanel } from "./settings/SessionsPanel";
import { WebhooksPanel } from "./settings/WebhooksPanel";
import { ApiKeysPanel } from "./settings/ApiKeysPanel";
import { TemplatesPanel } from "./settings/TemplatesPanel";
import { PluginsPanel } from "./settings/PluginsPanel";
import { InfraPanel } from "./settings/InfraPanel";
import { LogsPanel } from "./settings/LogsPanel";
import { MessageTesterPanel } from "./settings/MessageTesterPanel";

const NAV: Array<{ id: SettingsPanel; title: string; sub: string; icon: typeof Webhook }> = [
  { id: "overview", title: "Overview", sub: "Stats, charts, and session health", icon: Activity },
  { id: "sessions", title: "Sessions", sub: "Start, stop, QR, proxy, unlink", icon: Smartphone },
  { id: "webhooks", title: "Webhooks", sub: "Outbound event delivery + filters", icon: Webhook },
  { id: "api-keys", title: "API keys", sub: "Admin, operator, viewer tokens", icon: KeyRound },
  { id: "templates", title: "Templates", sub: "Reusable message bodies", icon: FileText },
  { id: "plugins", title: "Plugins", sub: "Catalog, config, instances", icon: Puzzle },
  { id: "infra", title: "Infrastructure", sub: "Database, Redis, engine, storage", icon: Server },
  { id: "logs", title: "Logs", sub: "Audit trail + CSV export", icon: ScrollText },
  { id: "message-tester", title: "Message tester", sub: "Every send type + bulk batch", icon: Send },
];

export function SettingsHub() {
  const panel = useGateway((s) => s.settingsPanel);
  const setPanel = useGateway((s) => s.setSettingsPanel);
  return (
    <div className="glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4">
      <div className="mb-4 flex items-center gap-3">
        {panel !== "home" ? (
          <button type="button" className={ghost} onClick={() => setPanel("home")}>
            Back
          </button>
        ) : null}
        <h2 className="text-base font-semibold">
          {panel === "home" ? "Settings" : NAV.find((n) => n.id === panel)?.title}
        </h2>
      </div>
      {panel === "home" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPanel(item.id)}
              className="flex items-start gap-3 rounded-2xl border border-line bg-night/30 p-4 text-left hover:bg-white/5"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-indigo/20 text-indigo">
                <item.icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="text-[11.5px] text-muted">{item.sub}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {panel === "overview" ? <OverviewPanel /> : null}
      {panel === "sessions" ? <SessionsPanel /> : null}
      {panel === "webhooks" ? <WebhooksPanel /> : null}
      {panel === "api-keys" ? <ApiKeysPanel /> : null}
      {panel === "templates" ? <TemplatesPanel /> : null}
      {panel === "plugins" ? <PluginsPanel /> : null}
      {panel === "infra" ? <InfraPanel /> : null}
      {panel === "logs" ? <LogsPanel /> : null}
      {panel === "message-tester" ? <MessageTesterPanel /> : null}
    </div>
  );
}
