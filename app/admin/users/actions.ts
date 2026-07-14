"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getAdminSession, getSuperAdminSession } from "@/lib/auth-guards";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult<T = unknown> =
  ({ ok: true } & T) | { ok: false; error: string };

export async function createActivationCode(): Promise<
  ActionResult<{ code: string }>
> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authorized." };

  const code = `RB-${randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    await prisma.activationCode.create({
      data: { code, createdBy: session.user.id, createdByName: session.user.name },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Generated a duplicate code — please try again." };
    }
    return { ok: false, error: "Could not create an activation code. Please try again." };
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/activation-codes");
  return { ok: true, code };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<ActionResult> {
  // Only "user" and "admin" are ever creatable here — never "super_admin" (that tier is
  // seed/DB-only, never minted at runtime) and never anything else a crafted request
  // might send, regardless of the TypeScript type on `input.role`.
  if (input.role !== "user" && input.role !== "admin") {
    return { ok: false, error: "Invalid role." };
  }

  // Creating a plain user only needs an admin session; minting a new ADMIN account is a
  // super-admin-only action (mirrors "super admin can manage other admins" — creating one
  // is part of managing them), so any admin can't mint peer admins on their own.
  const session =
    input.role === "admin" ? await getSuperAdminSession() : await getAdminSession();
  if (!session) return { ok: false, error: "Not authorized." };

  try {
    await auth.api.createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        // Better Auth requires `user:set-role` on the CALLER whenever `role` is present
        // in the body at all, regardless of value — so this is omitted entirely for the
        // plain-user case (defaults to "user" via lib/auth.ts's defaultRole) rather than
        // sent as role:"user", which would needlessly demand that permission from every
        // regular admin. It's only ever sent as "admin", and only once the session above
        // has already been verified to be super_admin (the one role granted set-role).
        ...(input.role === "admin" ? { role: input.role } : {}),
      },
      headers: await headers(),
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create user.",
    };
  }
}
