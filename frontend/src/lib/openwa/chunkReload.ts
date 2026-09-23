/** Reload once when a dynamic import chunk fails (stale deploy). */
const CHUNK_RELOAD_KEY = "openwa_chunk_reload";

export function maybeReloadOnChunkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  if (!/Failed to fetch dynamically imported module|Loading chunk .* failed/i.test(message)) return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}
