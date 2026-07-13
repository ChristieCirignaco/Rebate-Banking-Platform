"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
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
  await prisma.activationCode.create({
    data: { code, createdBy: session.user.id },
  });
  revalidatePath("/admin/users");
  return { ok: true, code };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authorized." };

  try {
    await auth.api.createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        role: input.role as "user" | "admin",
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
