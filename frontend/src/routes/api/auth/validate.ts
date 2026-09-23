import { createFileRoute } from "@tanstack/react-router";
import { forwardToGateway } from "@/lib/gateway-proxy.server";

/** Same-origin validate for the Connect screen (avoids CORS on login). Target: WA_GATEWAY_URL. */
export const Route = createFileRoute("/api/auth/validate")({
  server: {
    handlers: {
      POST: ({ request }) => forwardToGateway(request, "/api/auth/validate"),
    },
  },
});
