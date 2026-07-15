"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

// The outcome of a just-completed password sign-in, decided from the fresh account status.
// Anything that isn't an active regular user is signed back out here (server-side) so a
// pending/suspended/admin account never keeps a usable session on the user login.
export type LoginOutcome =
  | { kind: "active" }
  | { kind: "admin" }
  | { kind: "pending"; emailVerified: boolean }
  | { kind: "suspended" }
  | { kind: "none" };

export async function resolveLoginOutcome(): Promise<LoginOutcome> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { kind: "none" };

  // Admins must use the admin login — never establish an admin session here.
  if (isAdminTierRole(session.user.role)) {
    await auth.api.signOut({ headers: requestHeaders }).catch(() => {});
    return { kind: "admin" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, emailVerified: true },
  });
  if (!user) {
    await auth.api.signOut({ headers: requestHeaders }).catch(() => {});
    return { kind: "none" };
  }
  if (user.status === "active") return { kind: "active" };

  // Not approved yet (or suspended): drop the session and report so the login page can show
  // the inline notice instead of letting them reach a gated page.
  await auth.api.signOut({ headers: requestHeaders }).catch(() => {});
  if (user.status === "pending") {
    return { kind: "pending", emailVerified: user.emailVerified };
  }
  return { kind: "suspended" };
}
