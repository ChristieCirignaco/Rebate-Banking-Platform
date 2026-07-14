import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Server-side session + authorization helpers. Server actions and route handlers are
// separate entry points, so they must re-check auth here (the layout is not enough).

// The single source of truth for "which role strings count as admin-tier". Both
// getAdminSession() and app/admin/layout.tsx read this so they can never drift apart.
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminTierRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

// cache() dedupes repeated calls within one request/render pass (e.g. app/admin/layout.tsx
// and a page both resolving the session) — no behavior change, just one fewer DB round trip.
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

// Returns the admin session (admin or super_admin, and not suspended), or null.
//
// `status` is a custom Prisma column, not part of Better Auth's core session schema (no
// `user.additionalFields` is configured), so it isn't reliably present on session.user —
// this re-reads it fresh by the indexed primary key rather than trusting an assumed field,
// which also guarantees a just-suspended admin is locked out on their very next request.
export const getAdminSession = cache(async (): Promise<Session | null> => {
  const session = await getSession();
  if (!session) return null;
  if (!isAdminTierRole(session.user.role)) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true },
  });
  if (!user || user.status !== "active") return null;
  return session;
});

// Returns the session only for the super_admin tier — the sole role allowed to manage
// other admin accounts (edit/deactivate/reactivate) on /admin/users/admin.
export const getSuperAdminSession = cache(async (): Promise<Session | null> => {
  const session = await getAdminSession();
  return session && session.user.role === "super_admin" ? session : null;
});

export async function hasPermission(
  permissions: Record<string, string[]>,
): Promise<boolean> {
  try {
    const result = await auth.api.userHasPermission({
      headers: await headers(),
      body: { permissions },
    });
    return result.success === true;
  } catch {
    return false;
  }
}
