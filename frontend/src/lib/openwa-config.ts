const URL_KEY = "openwa_url";
const API_KEY_KEY = "openwa_api_key";

const DEFAULT_URL = "http://localhost:2785";

function envUrl(): string {
  const raw = (import.meta.env.VITE_OPENWA_URL as string | undefined) ?? "";
  return raw.replace(/\/+$/, "");
}

function envApiKey(): string {
  return (import.meta.env.VITE_OPENWA_APIKEY as string | undefined) ?? "";
}

export function getOpenWAUrl(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(URL_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  }
  return envUrl() || DEFAULT_URL;
}

export function getOpenWAApiKey(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(API_KEY_KEY) || window.sessionStorage.getItem(API_KEY_KEY);
    if (stored) return stored;
  }
  return envApiKey();
}

export function setOpenWACredentials(url: string, apiKey: string): void {
  const origin = url.replace(/\/+$/, "") || DEFAULT_URL;
  window.localStorage.setItem(URL_KEY, origin);
  window.localStorage.setItem(API_KEY_KEY, apiKey);
  window.sessionStorage.setItem(API_KEY_KEY, apiKey);
}

export function clearOpenWACredentials(): void {
  window.localStorage.removeItem(URL_KEY);
  window.localStorage.removeItem(API_KEY_KEY);
  window.sessionStorage.removeItem(API_KEY_KEY);
}

export function getOpenWAApiBase(): string {
  return `${getOpenWAUrl()}/api`;
}

export function getOpenWASocketOrigin(): string {
  return getOpenWAUrl();
}

export function openWAAuthHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  const key = getOpenWAApiKey();
  if (key) headers["X-API-Key"] = key;
  return headers;
}
