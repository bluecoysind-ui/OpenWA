export const CONFIG_UI_CSP = [
  "img-src 'self' data:",
  "media-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'unsafe-inline'",
  "connect-src 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "base-uri 'none'",
].join("; ");

export function injectConfigUiCsp(doc: Document): void {
  const meta = doc.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = CONFIG_UI_CSP;
  doc.head.prepend(meta);
}
