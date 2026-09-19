import { useState } from "react";
import { exportInfraData, importInfraData } from "../openwa-api";
import { shouldOfferStopOrphansRetry } from "./importRefusal";
import { useAppToast } from "./useToast";

export function useDataBackup() {
  const toast = useAppToast();
  const [migrating, setMigrating] = useState(false);

  const exportBackup = async () => {
    setMigrating(true);
    try {
      const dump = await exportInfraData();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openwa-backup-${dump.exportedAt?.slice(0, 10) || "data"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const omitted = dump.omittedInlineMedia;
      const dropped = (omitted?.messages ?? 0) + (omitted?.messageBatches ?? 0);
      if (dropped > 0) {
        toast.warning("Partial backup", `${dropped} media payloads were omitted from the archive.`);
      }
    } catch (err) {
      toast.error("Export failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMigrating(false);
    }
  };

  const runImport = async (tables: Record<string, unknown[]>, stopOrphans = false): Promise<void> => {
    try {
      const res = await importInfraData(tables, stopOrphans ? { stopOrphans: true } : undefined);
      if (res.imported) {
        if (res.restartRequired || (res.notices && res.notices.length > 0)) {
          toast.warning("Import finished", (res.notices ?? []).join("; ") || undefined);
        } else {
          toast.success("Import finished");
        }
      } else {
        toast.error("Import failed", (res.warnings || []).slice(0, 3).join("; ") || res.message);
      }
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      const code = (err as { code?: string } | null)?.code;
      if (shouldOfferStopOrphansRetry(status, code, stopOrphans) && err instanceof Error) {
        if (window.confirm(err.message)) await runImport(tables, true);
        else toast.error("Import failed", err.message);
        return;
      }
      const detail =
        status === 413
          ? "Backup is larger than the server body limit. Increase BODY_SIZE_LIMIT and retry."
          : err instanceof Error
            ? err.message
            : "Unknown error";
      toast.error("Import failed", detail);
    }
  };

  const importBackup = async (file: File) => {
    let parsed: { tables?: Record<string, unknown[]> };
    try {
      parsed = JSON.parse(await file.text()) as { tables?: Record<string, unknown[]> };
    } catch {
      toast.error("Import failed", "Invalid JSON file");
      return;
    }
    if (!parsed?.tables || typeof parsed.tables !== "object") {
      toast.error("Import failed", "Invalid backup file");
      return;
    }
    const rows = Object.values(parsed.tables).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0);
    if (!window.confirm(`This replaces all current data (${rows} rows). Continue?`)) return;
    setMigrating(true);
    try {
      await runImport(parsed.tables);
    } finally {
      setMigrating(false);
    }
  };

  return { migrating, exportBackup, importBackup };
}
