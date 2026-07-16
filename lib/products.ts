import { cache } from "react";

import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { toMajor } from "@/lib/money/money";

// User-facing product (rebate claim) reads. Ownership-scoped: every query is keyed by the
// caller's userId, never a client-supplied one.

export const USER_PRODUCTS_PAGE_SIZE = 10;

export type ProductStatus = "pending" | "approved" | "rejected";

export type ProductStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type ProductRowView = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string; // formatted unit price
  totalLabel: string; // unit price × quantity
  status: ProductStatus;
  imageUrl: string | null;
  adminNote: string | null;
  dateLabel: string; // submitted date, "Nov 4, 2026"
};

export type UserProductsPage = {
  items: ProductRowView[];
  total: number;
  page: number;
  pageCount: number;
};

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
}): ProductRowView {
  const lineTotalMinor = row.priceMinor * BigInt(row.quantity);
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unitLabel: formatCurrency(toMajor(row.priceMinor), row.currency),
    totalLabel: formatCurrency(toMajor(lineTotalMinor), row.currency),
    status: toStatus(row.status),
    imageUrl: row.imageUrl,
    adminNote: row.adminNote,
    dateLabel: row.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
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
