import { useGateway } from "@/store/gateway-store";

export function useAppToast() {
  const pushToast = useGateway((s) => s.pushToast);
  return {
    success: (title: string, desc?: string) => pushToast("success", desc ? `${title} — ${desc}` : title),
    error: (title: string, desc?: string) => pushToast("error", desc ? `${title} — ${desc}` : title),
    warning: (title: string, desc?: string) => pushToast("info", desc ? `${title} — ${desc}` : title),
  };
}
