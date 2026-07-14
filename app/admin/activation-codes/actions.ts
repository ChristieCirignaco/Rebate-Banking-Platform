"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { getActivationCodeDetail, getActivationCodes } from "@/lib/admin/activation-codes";
import type {
  ActivationCodeDetail,
  ActivationCodeListParams,
  ActivationCodeListResult,
  ActivationCodeStatus,
  CreateActivationCodePayload,
} from "@/components/admin/activation-codes/types";

export type ActionResult<T = unknown> =
  ({ ok: true } & T) | { ok: false; error: string };

const NOT_AUTHORIZED: { ok: false; error: string } = { ok: false, error: "Not authorized." };
const STATUSES: ActivationCodeStatus[] = ["active", "suspended"];

const EMPTY_LIST: ActivationCodeListResult = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

function revalidate() {
  revalidatePath("/admin/activation-codes");
  revalidatePath("/admin/users");
}

export async function listActivationCodes(
  params: ActivationCodeListParams,
): Promise<ActivationCodeListResult> {
  if (!(await getAdminSession())) return EMPTY_LIST;
  return getActivationCodes(params);
}

export async function getActivationCodeDetailAction(
  id: string,
): Promise<ActivationCodeDetail | null> {
  if (!(await getAdminSession())) return null;
  return getActivationCodeDetail(id);
}

export async function createActivationCodeEntry(
  payload: CreateActivationCodePayload,
): Promise<ActionResult<{ code: string }>> {
  const session = await getAdminSession();
  if (!session) return NOT_AUTHORIZED;

  const code = payload.code.trim();
  if (!code) return { ok: false, error: "Enter or generate a code." };
  if (code.length > 40) return { ok: false, error: "Code is too long." };
  if (!STATUSES.includes(payload.status)) {
    return { ok: false, error: "Choose a valid status." };
  }

  // The unique constraint on `code` is case-sensitive, but two codes that differ only by
  // case would look like duplicates to an admin — reject that case-insensitively up front.
  const collision = await prisma.activationCode.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "This code already exists." };

  try {
    await prisma.activationCode.create({
      data: {
        code,
        type: "admin_created",
        status: payload.status,
        notes: payload.notes?.trim() || null,
        createdBy: session.user.id,
        createdByName: session.user.name,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This code already exists." };
    }
    return { ok: false, error: "Could not create this code. Please try again." };
  }

  revalidate();
  return { ok: true, code };
}

export async function setActivationCodeStatus(
  id: string,
  status: ActivationCodeStatus,
): Promise<ActionResult> {
  if (!(await getAdminSession())) return NOT_AUTHORIZED;
  if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  const existing = await prisma.activationCode.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "Activation code not found." };

  await prisma.activationCode.update({ where: { id }, data: { status } });
  revalidate();
  return { ok: true };
}
