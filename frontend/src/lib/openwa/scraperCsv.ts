import { escapeCsvCell } from "./csv.ts";

/** Same columns Group Scraper writes and Add-to-group accepts. */
export const SCRAPER_CSV_HEADERS = ["phone", "name", "jid", "groups", "sources"] as const;

export type ScraperCsvRow = {
  phone: string;
  name?: string | null;
  jid?: string | null;
  groups?: string[];
  groupName?: string;
  sources?: string[];
  sessionId?: string;
};

export type ParsedScraperCsv = {
  phones: string[];
  names: Record<string, string>;
  skipped: number;
  totalRows: number;
};

function parseCsvTable(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      cell += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}

function colIndex(header: string[], name: string): number {
  return header.findIndex((h) => h === name);
}

function phoneFromCells(phoneRaw: string, jidRaw: string): string | null {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length >= 7 && digits.length <= 15) return digits;
  const local = jidRaw.split("@")[0] ?? "";
  if (/^\d{7,15}$/.test(local)) return local;
  return null;
}

/** Parse a Group Scraper (or matching) contacts CSV into unique dialable phones. */
export function parseScraperContactsCsv(text: string): ParsedScraperCsv {
  const table = parseCsvTable(text);
  if (table.length === 0) return { phones: [], names: {}, skipped: 0, totalRows: 0 };
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes("phone") || header.includes("jid");
  const body = hasHeader ? table.slice(1) : table;
  const phoneIdx = hasHeader && colIndex(header, "phone") >= 0 ? colIndex(header, "phone") : 0;
  const nameIdx = hasHeader ? colIndex(header, "name") : 1;
  const jidIdx = hasHeader ? colIndex(header, "jid") : 2;

  const phones: string[] = [];
  const names: Record<string, string> = {};
  const seen = new Set<string>();
  let skipped = 0;
  for (const row of body) {
    const phoneRaw = row[phoneIdx] ?? "";
    const jidRaw = jidIdx >= 0 ? (row[jidIdx] ?? "") : "";
    const nameRaw = nameIdx >= 0 ? (row[nameIdx] ?? "").trim() : "";
    const phone = phoneFromCells(phoneRaw, jidRaw);
    if (!phone) {
      skipped += 1;
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    phones.push(phone);
    if (nameRaw) names[phone] = nameRaw;
  }
  return { phones, names, skipped, totalRows: body.length };
}

export function formatScraperContactsCsv(rows: ScraperCsvRow[]): string {
  const lines = [SCRAPER_CSV_HEADERS.join(",")];
  for (const r of rows) {
    const phone = r.phone.replace(/\D/g, "");
    const groups = r.groups ?? (r.groupName ? [r.groupName] : []);
    const sources = r.sources ?? (r.sessionId ? [r.sessionId] : []);
    lines.push(
      [phone, r.name ?? "", r.jid ?? "", groups.join(" | "), sources.join(" | ")]
        .map((v) => escapeCsvCell(v))
        .join(","),
    );
  }
  return lines.join("\n");
}
