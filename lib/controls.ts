// Per-user capability gate. A user's `controls` is a JSON map; an ABSENT key means allowed and
// an explicit `false` means blocked. Keys must match the admin ControlKey / CONTROL_META
// (lib/admin/user-detail.ts) so a toggle in the admin UI actually reaches the guard. Shared by
// every money action so the fail-open semantics can't diverge between copies.
export function controlAllows(raw: unknown, key: string): boolean {
  if (!raw || typeof raw !== "object") return true;
  return (raw as Record<string, unknown>)[key] !== false;
}
