import { useEffect, useMemo, useState } from "react";
import {
  deleteStatus,
  listChannels,
  listChannelMessages,
  listContactStatuses,
  postTextStatus,
  type Channel,
  type ChannelMessage,
  type StatusUpdate,
} from "@/lib/openwa-api";
import { useCurrentEngineQuery } from "@/lib/openwa-query";
import { useAppToast } from "@/lib/openwa/useToast";
import { useGateway } from "@/store/gateway-store";
import { cn } from "@/lib/cn";

function FeedEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12px] text-muted">{children}</div>;
}

import type { ChatFeedTab } from "@/store/gateway-store";

export function ChatFeedTabBar({ tab, onTab }: { tab: ChatFeedTab; onTab: (t: ChatFeedTab) => void }) {
  const items: Array<{ id: ChatFeedTab; label: string }> = [
    { id: "chats", label: "Chats" },
    { id: "channels", label: "Channels" },
    { id: "status", label: "Status" },
  ];
  return (
    <div className="flex gap-1 px-4 pb-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTab(item.id)}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-medium",
            tab === item.id ? "bg-indigo/25 text-indigo" : "bg-white/5 text-muted",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ChannelsPane({ sessionId }: { sessionId: string }) {
  const engine = useCurrentEngineQuery(Boolean(sessionId));
  const supported = engine.data?.engineType === "whatsapp-web.js";
  const pushToast = useGateway((s) => s.pushToast);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !supported) return;
    let cancelled = false;
    setLoading(true);
    void listChannels(sessionId)
      .then((list) => {
        if (!cancelled) setChannels(list.filter((c) => Boolean(c.id)));
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed";
          pushToast("error", `Channels — ${msg}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, supported, pushToast]);

  useEffect(() => {
    if (!sessionId) {
      setChannels([]);
      setActive(null);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !active) {
      setMessages([]);
      return;
    }
    void listChannelMessages(sessionId, active.id).then(setMessages).catch(() => setMessages([]));
  }, [sessionId, active]);

  if (engine.isPending || (engine.isFetching && !engine.data)) {
    return <FeedEmpty>Loading channels…</FeedEmpty>;
  }
  if (!supported) {
    return <FeedEmpty>Channels need the whatsapp-web.js engine.</FeedEmpty>;
  }
  if (loading) return <FeedEmpty>Loading channels…</FeedEmpty>;
  if (!active) {
    return (
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {channels.length === 0 ? (
          <FeedEmpty>No subscribed channels.</FeedEmpty>
        ) : (
          channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className="mb-1 flex w-full rounded-2xl px-3 py-2.5 text-left hover:bg-white/5"
              onClick={() => setActive(ch)}
            >
              <div className="text-sm font-medium">{ch.name}</div>
              <div className="text-[11px] text-muted">{ch.subscriberCount ?? 0} subscribers</div>
            </button>
          ))
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button type="button" className="px-4 py-2 text-left text-xs text-indigo" onClick={() => setActive(null)}>
        ← Channels
      </button>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-4 pb-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-night/30 px-3 py-2 text-sm">
            <div className="text-[10px] text-muted">{new Date(m.timestamp * 1000).toLocaleString()}</div>
            <div className="whitespace-pre-wrap">{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusPane({ sessionId }: { sessionId: string }) {
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState("");
  const toast = useAppToast();
  const grouped = useMemo(() => {
    const map = new Map<string, StatusUpdate[]>();
    for (const s of statuses) {
      const key = s.contact.id;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [statuses]);

  const reload = () => {
    if (!sessionId) return;
    setLoading(true);
    void listContactStatuses(sessionId)
      .then((r) => setStatuses(r.statuses ?? []))
      .catch((e) => toast.error("Status", e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const post = async () => {
    if (!text.trim()) return;
    try {
      await postTextStatus(sessionId, text.trim());
      setText("");
      setCompose(false);
      toast.success("Status posted");
      reload();
    } catch (e) {
      toast.error("Post failed", e instanceof Error ? e.message : "");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-xs text-muted">{loading ? "Loading…" : `${statuses.length} updates`}</span>
        <button type="button" className="text-xs text-indigo" onClick={() => setCompose((v) => !v)}>
          {compose ? "Cancel" : "New status"}
        </button>
      </div>
      {compose ? (
        <div className="space-y-2 px-4 pb-2">
          <textarea
            className="w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text status"
          />
          <button type="button" className="rounded-xl bg-indigo px-3 py-1.5 text-xs text-white" onClick={() => void post()}>
            Post
          </button>
        </div>
      ) : null}
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {grouped.length === 0 ? (
          <FeedEmpty>No status updates.</FeedEmpty>
        ) : (
          grouped.map(([contactId, items]) => (
            <div key={contactId} className="mb-3 rounded-2xl border border-line bg-night/20 p-3">
              <div className="text-sm font-medium">{items[0]?.contact.name || items[0]?.contact.pushName || contactId}</div>
              {items.map((s) => (
                <div key={s.id} className="mt-2 border-t border-line/50 pt-2 text-[12px]">
                  <div className="text-muted">{s.type}</div>
                  <div>{s.caption || "(media)"}</div>
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-danger"
                    onClick={() =>
                      void deleteStatus(sessionId, s.id)
                        .then(reload)
                        .catch(() => undefined)
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
