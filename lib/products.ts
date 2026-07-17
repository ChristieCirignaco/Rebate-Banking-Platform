import { cache } from "react";

import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";
import {
  USER_PRODUCTS_PAGE_SIZE,
  type ProductRowView,
  type ProductStats,
  type ProductStatus,
  type UserProductsPage,
} from "@/lib/products-view";

// Server-only product (rebate claim) reads. Ownership-scoped: every query is keyed by the
// caller's userId, never a client-supplied one. The client-safe view types + constants live in
// lib/products-view (imported by client components); re-exported here so server callers get
// both from one place.
export * from "@/lib/products-view";

function toStatus(value: string): ProductStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function present(row: {
  id: string;
  name: string;
  priceMinor: bigint;
  currency: string;
  quantity: number;
  imageUrl: string | null;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}): ProductRowView {
  const lineTotalMinor = row.priceMinor * BigInt(row.quantity);
  const dateFmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unitLabel: formatCurrency(toMajor(row.priceMinor), row.currency),
    priceMajor: toMajor(row.priceMinor),
    totalLabel: formatCurrency(toMajor(lineTotalMinor), row.currency),
    status: toStatus(row.status),
    imageUrl: row.imageUrl,
    adminNote: row.adminNote,
    dateLabel: dateFmt(row.createdAt),
    reviewedLabel: row.reviewedAt ? dateFmt(row.reviewedAt) : null,
  };
}

// The user's submissions, newest first, one page at a time.
export const getUserProducts = cache(
  async (userId: string, page = 1): Promise<UserProductsPage> => {
    const take = USER_PRODUCTS_PAGE_SIZE;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * take,
        take,
      }),
      prisma.product.count({ where: { userId } }),
    ]);
    return {
      items: rows.map(present),
      total,
      page: safePage,
      pageCount: Math.max(1, Math.ceil(total / take)),
    };
  },
);

// Count-by-status for the header stat chips.
export const getUserProductStats = cache(async (userId: string): Promise<ProductStats> => {
  const groups = await prisma.product.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });
  const count = (status: ProductStatus) =>
    groups.find((g) => g.status === status)?._count._all ?? 0;
  return {
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
    pending: count("pending"),
    approved: count("approved"),
    rejected: count("rejected"),
  };
});
