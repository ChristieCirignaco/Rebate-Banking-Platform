// Per-user control gate. A user's `controls` is a JSON map; the keys must match the admin
// ControlKey / CONTROL_META (lib/admin/user-detail.ts) so a toggle in the admin UI actually
// reaches the guard. Shared by every money action so the semantics can't diverge between copies.
//
// There are two kinds of control, and they read an ABSENT key in OPPOSITE directions:
//
//   capability  — "Allows deposits", "Allows withdrawal…". Absent means allowed (fail-open), so a
//                 user no admin has touched can do everything. Only an explicit `false` blocks.
//   requirement — "Requires email verification…", "Requires KYC…". Absent means NOT required;
//                 only an explicit `true` turns the requirement on for that user.
//
// Reading a requirement through controlAllows inverts it — `kyc_verification: true` would come
// back "allowed" when it means "KYC is required" — so the two kinds have separate readers, and
// CONTROL_META tags every key with its kind.
export type ControlKind = "capability" | "requirement";

function asMap(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

// Capability: absent or true = allowed; only an explicit false blocks.
export function controlAllows(raw: unknown, key: string): boolean {
  const map = asMap(raw);
  return map ? map[key] !== false : true;
}

// Requirement: only an explicit true turns it on.
export function controlRequires(raw: unknown, key: string): boolean {
  const map = asMap(raw);
  return map ? map[key] === true : false;
}

// What a toggle shows for a key no admin has set yet — i.e. the default the guards actually
// apply. Without this the admin UI renders every untouched user as "everything off" while the
// guards allow everything.
export function controlDefault(kind: ControlKind): boolean {
  return kind === "capability";
}
