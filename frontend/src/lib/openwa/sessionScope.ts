export function canScopeSessions(role: string): boolean {
  return role === "operator" || role === "viewer";
}

export function sameSessionScope(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function sessionScopeNames(
  allowedSessions: string[] | undefined | null,
  sessions: ReadonlyArray<{ id: string; name: string }>,
): string[] | null {
  if (!allowedSessions || allowedSessions.length === 0) return null;
  const byId = new Map(sessions.map((session) => [session.id, session.name]));
  return allowedSessions.map((id) => byId.get(id) ?? id);
}
