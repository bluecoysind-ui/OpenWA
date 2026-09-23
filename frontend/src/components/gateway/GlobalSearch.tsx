import { useCallback, useEffect, useRef, useState } from "react";
import { searchMessages, type SearchHit } from "@/lib/openwa-api";
import { buildSearchParams, renderHighlightedSnippet } from "@/lib/openwa/search-highlight";
import { useTranslation } from "react-i18next";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function GlobalSearch({
  currentSessionId,
  onHit,
  compact,
}: {
  currentSessionId?: string;
  onHit: (hit: SearchHit) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const run = useCallback(
    async (query: string, offset: number, append: boolean) => {
      const id = ++requestId.current;
      const params = buildSearchParams(
        query,
        currentSessionId ? { sessionId: currentSessionId } : undefined,
        { limit: PAGE_SIZE, offset },
      );
      if (!params) {
        setHits([]);
        setTotal(0);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await searchMessages(params);
        if (id !== requestId.current) return;
        setHits((prev) => (append ? [...prev, ...res.hits] : res.hits));
        setTotal(res.total);
      } catch (e: unknown) {
        if (id !== requestId.current) return;
        const status = (e as { status?: number }).status;
        if (status === 501) setError(t("search.unavailable", { defaultValue: "Search not available on this engine" }));
        else setError(t("search.error", { defaultValue: "Search failed" }));
        setHits([]);
        setTotal(0);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [currentSessionId, t],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      requestId.current += 1;
      setHits([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }
    timer.current = setTimeout(() => {
      setOpen(true);
      void run(q, 0, false);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, run]);

  const loadMore = () => void run(q, hits.length, true);

  return (
    <div className={compact ? "relative w-full" : "relative min-w-[200px] flex-1"}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
        placeholder={t("search.placeholder", { defaultValue: "Search messages…" })}
        className="h-10 w-full rounded-xl border border-line bg-white/5 px-3 text-sm text-ink outline-none"
      />
      {open && q.trim() ? (
        <div className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-night/95 p-2 shadow-xl">
          {loading ? <p className="px-2 py-1 text-xs text-muted">{t("search.loading", { defaultValue: "Searching…" })}</p> : null}
          {error ? <p className="px-2 py-1 text-xs text-danger">{error}</p> : null}
          {hits.map((h) => (
            <button
              key={`${h.chatId}-${h.messageId}`}
              type="button"
              className="w-full rounded-lg px-2 py-2 text-left hover:bg-white/5"
              onClick={() => {
                onHit(h);
                setOpen(false);
              }}
            >
              <div className="text-xs font-medium">{h.chatId}</div>
              <div className="truncate text-[11px] text-muted">
                {renderHighlightedSnippet(h.snippet || h.body).map((seg, i) =>
                  seg.marked ? <mark key={i} className="bg-wa/30 text-inherit">{seg.text}</mark> : <span key={i}>{seg.text}</span>,
                )}
              </div>
            </button>
          ))}
          {hits.length < total ? (
            <button type="button" className="mt-1 w-full rounded-lg py-1 text-xs text-indigo" onClick={loadMore}>
              {t("search.loadMore", { defaultValue: "Load more" })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
