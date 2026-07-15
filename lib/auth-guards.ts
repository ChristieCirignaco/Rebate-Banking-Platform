import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { needsLoginOtpVerification } from "@/lib/login-otp";

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

// The account lifecycle for regular (non-admin) users, expressed over the existing
// `user.status` + `emailVerified` columns:
//   pending  + emailVerified=false -> registered, must verify email
//   pending  + emailVerified=true  -> verified, awaiting manual admin approval
//   active                         -> approved; full access (email-unverified only shows an
//                                     indicator, it never blocks an already-active user)
//   suspended / anything else      -> blocked
export type UserAccountState = {
  status: string;
  emailVerified: boolean;
  name: string;
  email: string;
};

// Session + not-admin-tier + a fresh status read for a regular-user page. Redirects rather
// than returning null: no session -> /login, admin-tier -> /admin, pending/suspended ->
// /login with an inline notice (the login page only bounces ACTIVE sessions to the dashboard,
// so this can't loop). Status is re-read by primary key every request so a just-suspended user
// is locked out on their very next navigation (spec §9.2). Returns the live session + user
// state for an ACTIVE user only.
export async function requireActiveUserAccount(): Promise<{
  session: Session;
  user: UserAccountState;
}> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isAdminTierRole(session.user.role)) redirect("/admin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, emailVerified: true, name: true, email: true },
  });
  if (!user) redirect("/login");
  if (user.status === "pending") redirect("/login?notice=pending");
  if (user.status !== "active") redirect("/login?notice=suspended");
  return { session, user };
}

// The full gate for an authenticated regular-user page: an active account that has also
// cleared the email-OTP-on-login challenge. Use this on /dashboard and /account/* so the
// whole chain (session -> role -> status -> OTP) is applied consistently in one place.
export async function requireActiveUser(): Promise<{
  session: Session;
  user: UserAccountState;
}> {
  const gate = await requireActiveUserAccount();
  if (await needsLoginOtpVerification(gate.session.session.id, gate.session.user.role)) {
    redirect("/verify-otp");
  }
  return gate;
}

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
