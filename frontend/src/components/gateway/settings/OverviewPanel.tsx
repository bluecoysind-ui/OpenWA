import { useState } from "react";
import { Activity, Loader2, MessageSquare, Send, Webhook } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSessionsQuery, useSessionStatsQuery, useStatsMessagesQuery, useStatsOverviewQuery, useStopSessionMutation, useWebhooksQuery } from "@/lib/openwa-query";
import type { StatsPeriod } from "@/lib/openwa-api";
import { useGateway } from "@/store/gateway-store";
import { sessionDisplayName } from "@/lib/openwa/sessionLabel";
import { btn, Card, ErrorLine, ghost } from "./ui";

const TYPE_COLORS: Record<string, string> = {
  text: "#25d366",
  image: "#3b82f6",
  contact: "#a855f7",
  document: "#f59e0b",
  audio: "#06b6d4",
  voice: "#ec4899",
  video: "#14b8a6",
  sticker: "#ef4444",
  location: "#84cc16",
  poll: "#6366f1",
  revoked: "#f43f5e",
  unknown: "#64748b",
};

function formatLastActive(date?: string | null) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  return new Date(date).toLocaleDateString();
}

export function OverviewPanel() {
  const setPanel = useGateway((s) => s.setSettingsPanel);
  const sessions = useSessionsQuery();
  const stats = useSessionStatsQuery();
  const webhooks = useWebhooksQuery();
  const overview = useStatsOverviewQuery();
  const stop = useStopSessionMutation();
  const [period, setPeriod] = useState<StatsPeriod>("24h");
  const charts = useStatsMessagesQuery(period);
  const forbidden = (charts.error as { status?: number } | null)?.status === 403;
  const messagesToday = overview.data
    ? overview.data.messages.today.sent + overview.data.messages.today.received
    : "—";
  const totalMessages = overview.data ? overview.data.messages.sent + overview.data.messages.received : "—";
  const webhookCount = webhooks.isError && !webhooks.data ? "—" : (webhooks.data ?? []).length;
  const timeSeries = (charts.data?.timeSeries ?? []).map((p) => ({
    ...p,
    label: period === "24h" ? p.timestamp.slice(11, 16) : p.timestamp.slice(5),
  }));
  const byType = Object.entries(charts.data?.byType ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topChats = (charts.data?.topChats ?? []).slice(0, 8).map((c) => ({
    name: c.chatName || c.chatId.split("@")[0],
    count: c.messageCount,
  }));

  if (sessions.isLoading) return <Loader2 className="animate-spin text-muted" />;

  return (
    <div className="space-y-3">
      <ErrorLine error={sessions.error} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ready sessions", value: stats.data?.ready ?? 0, icon: MessageSquare, detail: stats.data ? `${stats.data.active} running · ${stats.data.total} total` : undefined },
          { label: "Messages today", value: messagesToday, icon: Send },
          { label: "Webhooks", value: webhookCount, icon: Webhook },
          { label: "Total messages", value: totalMessages, icon: Activity },
        ].map((card) => (
          <Card key={card.label} title={card.label}>
            <div className="text-2xl font-semibold">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</div>
            {card.detail ? <p className="mt-1 text-[11px] text-muted">{card.detail}</p> : null}
          </Card>
        ))}
      </div>

      {!forbidden ? (
        <Card
          title="Traffic"
          sub="Message volume from GET /stats/messages"
          actions={
            <div className="flex gap-1">
              {(["24h", "7d", "30d"] as const).map((p) => (
                <button key={p} type="button" className={period === p ? btn : ghost} onClick={() => setPeriod(p)}>
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <ErrorLine error={charts.error} />
          {charts.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="#9aa3c0" fontSize={11} />
                  <YAxis stroke="#9aa3c0" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="sent" stroke="#25d366" fill="rgba(37,211,102,0.2)" />
                  <Area type="monotone" dataKey="received" stroke="#6366f1" fill="rgba(99,102,241,0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {byType.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChats}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#9aa3c0" fontSize={11} />
                  <YAxis stroke="#9aa3c0" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Sessions" sub={`${sessions.data?.length ?? 0} accounts`}>
        <div className="overflow-hidden rounded-xl border border-line">
          {(sessions.data ?? []).map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-0">
              <div>
                <div className="text-sm font-medium">{sessionDisplayName(session)}</div>
                <div className="text-[11px] text-muted">
                  {session.phone || "—"} · {session.status} · {formatLastActive(session.lastActive)}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={ghost} onClick={() => setPanel("sessions")}>
                  Manage
                </button>
                {["ready", "initializing", "qr_ready"].includes(session.status) ? (
                  <button type="button" className={ghost} disabled={stop.isPending} onClick={() => stop.mutate(session.id)}>
                    Disconnect
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {(sessions.data ?? []).length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">No sessions yet</p> : null}
        </div>
      </Card>
    </div>
  );
}
