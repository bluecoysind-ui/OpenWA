export function isAdminRole(user: string | undefined | null): boolean {
  return (user ?? "").toLowerCase() === "admin";
}
