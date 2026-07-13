"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
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

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
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
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true };
}
