import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import i18n, { i18nReady } from "@/i18n";
import appCss from "../styles.css?url";

void i18nReady;

const APP_NAME = "WA Gateway";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0B0618" },
      { name: "description", content: "Multi-account WhatsApp control center" },
      { name: "openwa-csp-nonce", content: "__OPENWA_CSP_NONCE__" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  ),
});
