import type { OpenWASession } from "../openwa-api";

const STARTED_STATUSES_FALLBACK = new Set(["initializing", "qr_ready", "authenticating", "ready", "action_required"]);

export function isSessionStarted(session: Pick<OpenWASession, "status" | "engineLoaded">): boolean {
  return session.engineLoaded ?? STARTED_STATUSES_FALLBACK.has(session.status);
}

export function awaitsPairing(session: Pick<OpenWASession, "status" | "phone">): boolean {
  return session.status === "qr_ready" || (session.status === "initializing" && !session.phone);
}

export function canUnlinkSession(session: Pick<OpenWASession, "status" | "engineLoaded">): boolean {
  return isSessionStarted(session);
}

export function canForceKillSession(session: Pick<OpenWASession, "status" | "engineLoaded">): boolean {
  return isSessionStarted(session);
}

export function classifyUnlinkError(err: unknown): "incomplete" | "generic" {
  const e = err as { code?: string } | null | undefined;
  return e?.code === "SESSION_LOGOUT_INCOMPLETE" ? "incomplete" : "generic";
}
