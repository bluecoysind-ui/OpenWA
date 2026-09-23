/** Warn when API keys would be sent over cleartext HTTP to a non-local host. */

export function warnIfInsecureHttpUrl(url: string, label: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      console.warn(
        `[OpenWA] ${label} uses an insecure http:// URL (host: ${parsed.hostname}). ` +
          "API keys may be sent in cleartext unless TLS terminates in front of the gateway.",
      );
    }
  } catch {
    /* ignore invalid URLs at call sites that validate separately */
  }
  return url;
}
