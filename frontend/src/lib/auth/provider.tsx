import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** Clears React Query after logout so the next actor never sees cached rows. */
export function clearAppQueryCache(): void {
  queryClient.clear();
}

/**
 * App-wide client provider mounted once near the root (in `src/routes/__root.tsx`).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
