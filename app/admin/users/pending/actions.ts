"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { notifyUserOf } from "@/lib/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, error: "Not authorized." };
const NOT_FOUND: ActionResult = { ok: false, error: "Pending account not found." };

function revalidate() {
  revalidatePath("/admin/users/pending");
  revalidatePath("/admin/users");
}

// Load a regular user that is currently pending. Guards against acting on admin-tier accounts
// or on users that have already been decided (active/suspended), so a double-submit is a no-op.
async function loadPendingTarget(id: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, status: true, name: true },
  });
  if (!target || isAdminTierRole(target.role)) return null;
  return target;
}

// Approve a pending registration: status -> "active" unlocks full access. Admin-only.
export async function approveUser(id: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const target = await loadPendingTarget(id);
  if (!target) return NOT_FOUND;
  if (target.status !== "pending") {
    return { ok: false, error: "This account has already been decided." };
  }

  await prisma.user.update({ where: { id }, data: { status: "active" } });

  // Registration tells the user their account is reviewed and approved before they can sign in,
  // and this is the moment that promise is kept — without a mail the only way to discover it is
  // to keep retrying the login. Best-effort and post-commit: notifyUserOf swallows its own
  // errors, so a mailer outage can't undo an approval.
  await notifyUserOf(id, {
    type: "email",
    title: "Account Approved",
    greeting: `Dear ${target.name?.trim() || "Customer"},`,
    message:
      "Your account has been approved and is now active. You can sign in and start using your account.",
    cta: { label: "Sign in", url: "/login" },
  });

  revalidate();
  return { ok: true };
}

// Reject a pending registration: status -> "suspended" keeps the record but blocks access.
export async function rejectUser(id: string): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const target = await loadPendingTarget(id);
  if (!target) return NOT_FOUND;
  if (target.status !== "pending") {
    return { ok: false, error: "This account has already been decided." };
  }

  await prisma.user.update({ where: { id }, data: { status: "suspended" } });
  // Invalidate any live sessions so a rejected user can't keep browsing on a stale cookie.
  await prisma.session.deleteMany({ where: { userId: id } });

  // No reason is given: rejection criteria aren't captured anywhere in this flow, so inventing
  // one would be worse than pointing at support. The CTA is deliberately support, not /login —
  // signing in is exactly what won't work now.
  await notifyUserOf(id, {
    type: "email",
    title: "Account Application Declined",
    greeting: `Dear ${target.name?.trim() || "Customer"},`,
    message:
      "We're unable to approve your account at this time. If you believe this is a mistake, please contact our support team and we'll take another look.",
    cta: { label: "Contact support", url: "/contact" },
  });

  revalidate();
  return { ok: true };
}
