"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

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
    select: { role: true, status: true },
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
  revalidate();
  return { ok: true };
}
