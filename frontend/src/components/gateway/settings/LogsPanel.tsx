import { useState } from "react";
import { Download, FileText, Loader2, Search } from "lucide-react";
import { listAuditLogs, type AuditLog } from "@/lib/openwa-api";
import { escapeCsvCell } from "@/lib/openwa/csv";
import { fetchAllPages } from "@/lib/openwa/fetchAllPages";
import { pageWindow } from "@/lib/openwa/pageWindow";
import { useLogsQuery } from "@/lib/openwa-query";
import { ErrorLine, field, ghost } from "./ui";

function buildCsv(rows: AuditLog[]): string {
  const headers = ["timestamp", "action", "severity", "session", "apiKey", "ip", "method", "path", "statusCode", "errorMessage"];
  const lines = rows.map((log) =>
    [
      log.createdAt,
      log.action,
      log.severity,
      log.sessionName || log.sessionId || "",
      log.apiKeyName || log.apiKeyId || "",
      log.ipAddress,
      log.method,
      log.path,
      log.statusCode,
      log.errorMessage,
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export function LogsPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const limit = 20;
  const logs = useLogsQuery({ severity: severity || undefined, page, limit });
  const rows = logs.data?.data ?? [];
  const total = logs.data?.total ?? 0;
  const filtered = rows.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.errorMessage || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const download = (csv: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openwa-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all = await fetchAllPages<AuditLog>((lim, offset) =>
        listAuditLogs({ severity: severity || undefined, limit: lim, offset }),
      );
      const q = searchQuery.toLowerCase();
      const out = q
        ? all.filter((l) => l.action.toLowerCase().includes(q) || (l.errorMessage || "").toLowerCase().includes(q))
        : all;
      if (out.length > 0) download(buildCsv(out));
    } catch {
      if (filtered.length > 0) download(buildCsv(filtered));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <ErrorLine error={logs.error} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute top-2.5 left-3 text-muted" />
          <input
            className={`${field} pl-8`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search action or error"
          />
        </div>
        <select
          className={`${field} w-36`}
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All severities</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <button type="button" className={ghost} disabled={exporting || total === 0} onClick={() => void handleExport()}>
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
        </button>
      </div>
      {logs.isLoading ? <Loader2 className="animate-spin text-muted" /> : null}
      <div className="overflow-hidden rounded-2xl border border-line">
        {filtered.length === 0 && !logs.isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            <FileText className="mx-auto mb-2" />
            {searchQuery || severity ? "No logs match these filters on this page." : "No audit logs yet."}
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="border-b border-line px-3 py-2 text-[12px] last:border-0">
              <div className="flex justify-between gap-2">
                <span className={row.severity === "error" ? "text-danger" : row.severity === "warn" ? "text-amber-300" : "text-muted"}>
                  {row.severity}
                </span>
                <span className="text-dim">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <div className="font-medium">{row.action}</div>
              <div className="text-muted">
                {row.sessionName || row.sessionId || "—"} · {row.apiKeyName || row.apiKeyId || "—"} · {row.ipAddress || "—"}
              </div>
              <div className="text-dim">
                {row.method} {row.path} {row.statusCode ?? ""} {row.errorMessage ?? ""}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghost} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Previous
        </button>
        {pageWindow(page + 1, totalPages).map((n) => (
          <button key={n} type="button" className={n === page + 1 ? ghost.replace("text-muted", "text-ink") : ghost} onClick={() => setPage(n - 1)}>
            {n}
          </button>
        ))}
        <button type="button" className={ghost} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
