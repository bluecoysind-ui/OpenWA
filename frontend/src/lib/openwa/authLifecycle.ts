export type UserRole = "admin" | "operator" | "viewer";

const USER_ROLES: readonly UserRole[] = ["admin", "operator", "viewer"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export interface ClearableCache {
  clear(): void;
}

export function clearActorState(...caches: ClearableCache[]): void {
  for (const cache of caches) cache.clear();
}

export type StartupValidation = { action: "role"; role: UserRole } | { action: "logout" } | { action: "keep" };

export function resolveStartupValidation(
  status: number,
  body: { valid?: boolean; role?: string } | null,
): StartupValidation {
  if (status === 401 || status === 403) return { action: "logout" };
  if (status < 200 || status >= 300) return { action: "keep" };
  if (body?.role && isUserRole(body.role)) return { action: "role", role: body.role };
  return { action: "keep" };
}
