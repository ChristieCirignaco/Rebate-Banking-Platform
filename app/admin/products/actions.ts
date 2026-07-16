"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import { notifyUserOf } from "@/lib/notifications";
import type { ProductStatus } from "@/components/admin/products/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_STATUSES: ProductStatus[] = ["pending", "approved", "rejected"];

export async function updateProductStatus(
  productId: string,
  status: ProductStatus,
  adminNote?: string,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  // userId/name/price are read for the user-facing notice below, not the existence check.
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, userId: true, name: true, priceMinor: true, currency: true },
  });
  if (!existing) return { ok: false, error: "Submission not found." };

  const note = adminNote?.trim();
  const reviewed = status !== "pending";

  await prisma.product.update({
    where: { id: productId },
    data: {
      status,
      adminNote: note ? note : null,
      // Reset clears the review audit; approve/reject stamps who/when.
      reviewedAt: reviewed ? new Date() : null,
      reviewedBy: reviewed ? session.user.id : null,
      reviewedByName: reviewed ? session.user.name : null,
    },
  });

  // Best-effort notice, post-commit. Only approve/reject is news to the user; a reset back to
  // pending is silent housekeeping.
  if (reviewed) {
    await notifyUserOf(existing.userId, {
      title: status === "approved" ? "Product approved" : "Product rejected",
      message: `Your product "${existing.name}" (${formatCurrency(
        toMajor(existing.priceMinor),
        existing.currency,
      )}) was ${status}.${note ? ` Remarks: ${note}` : ""}`,
    });
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}
