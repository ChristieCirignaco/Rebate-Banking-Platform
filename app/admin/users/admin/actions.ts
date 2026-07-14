"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getSuperAdminSession, isAdminTierRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import type { AdminEditPayload } from "@/components/admin/admins/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORIZED: ActionResult = {
  ok: false,
  error: "Only a super admin can manage admin accounts.",
};
const NOT_FOUND: ActionResult = { ok: false, error: "Admin account not found." };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function revalidate() {
  revalidatePath("/admin/users/admin");
}

// Edits a target admin's non-sensitive info (name/phone/gender/address/birthday), plus
// email/password IF AND ONLY IF the target is a regular admin — never for super_admin,
// whose email/password are deferred to their own future self-service profile panel.
// Enforced here server-side regardless of what the client sends, since the UI is the
// only other thing keeping those fields out of the payload for a super_admin target.
export async function updateAdminInfo(
  id: string,
  payload: AdminEditPayload,
): Promise<ActionResult> {
  const session = await getSuperAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || !isAdminTierRole(target.role)) return NOT_FOUND;

  const name = [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const isSuperAdminTarget = target.role === "super_admin";

  // Empty string means "the admin cleared this field" — write null, not "leave
  // unchanged". Only a genuinely-omitted (undefined) value leaves the column untouched.
  const data: Prisma.UserUpdateInput = {
    name,
    phone: payload.phone !== undefined ? payload.phone.trim() || null : undefined,
    gender: payload.gender,
    address: payload.address !== undefined ? payload.address.trim() || null : undefined,
    birthday:
      payload.birthday !== undefined
        ? payload.birthday
          ? new Date(payload.birthday)
          : null
        : undefined,
  };

  let newPassword: string | null = null;
  if (!isSuperAdminTarget) {
    const email = payload.email?.trim().toLowerCase();
    if (email) {
      if (!EMAIL_RE.test(email)) {
        return { ok: false, error: "Enter a valid email address." };
      }
      data.email = email;
      data.emailVerified = false; // an admin-forced change hasn't been re-verified
    }
    const rawPassword = payload.newPassword?.trim();
    if (rawPassword) {
      if (rawPassword.length < 8) {
        return { ok: false, error: "Password must be at least 8 characters." };
      }
      newPassword = rawPassword;
    }
  }

  try {
    await prisma.user.update({ where: { id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That email is already in use." };
    }
    return { ok: false, error: "Could not update this admin. Please try again." };
  }

  // The main update already committed and is revalidated regardless of what happens
  // next, so a password-specific failure never leaves the table showing stale data.
  revalidate();

  if (newPassword) {
    try {
      await auth.api.setUserPassword({
        body: { userId: id, newPassword },
        headers: await headers(),
      });
    } catch {
      return { ok: false, error: "Info saved, but the password could not be updated." };
    }
  }

  return { ok: true };
}

// Suspends a regular admin's account (blocks their next getAdminSession() check — see
// lib/auth-guards.ts). Reversible via reactivateAdmin. Super admin can never be
// suspended, and a super admin can't suspend themself.
export async function deactivateAdmin(id: string): Promise<ActionResult> {
  const session = await getSuperAdminSession();
  if (!session) return NOT_AUTHORIZED;
  if (id === session.user.id) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, status: true },
  });
  if (!target || !isAdminTierRole(target.role)) return NOT_FOUND;
  if (target.role === "super_admin") {
    return { ok: false, error: "Super Admin accounts cannot be deactivated." };
  }
  if (target.status !== "suspended") {
    await prisma.user.update({ where: { id }, data: { status: "suspended" } });
  }

  revalidate();
  return { ok: true };
}

export async function reactivateAdmin(id: string): Promise<ActionResult> {
  const session = await getSuperAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, status: true },
  });
  if (!target || !isAdminTierRole(target.role)) return NOT_FOUND;
  if (target.status !== "active") {
    await prisma.user.update({ where: { id }, data: { status: "active" } });
  }

  revalidate();
  return { ok: true };
}
