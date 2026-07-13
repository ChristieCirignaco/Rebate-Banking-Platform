import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toMajor } from "@/lib/money/money";
import type {
  ProductListParams,
  ProductListResult,
  ProductStatus,
  ProductSubmission,
  SubmissionStats,
  UserProductStats,
} from "@/components/admin/products/types";

export const PRODUCT_PAGE_SIZE = 10;

type ProductWithUser = Prisma.ProductGetPayload<{ include: { user: true } }>;

function toSubmission(row: ProductWithUser): ProductSubmission {
  return {
    id: row.id,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      phone: row.user.phone ?? undefined,
      avatarUrl: row.user.image ?? undefined,
      joinedAt: row.user.createdAt.toISOString(),
    },
    productName: row.name,
    price: toMajor(row.priceMinor),
    currency: row.currency,
    quantity: row.quantity,
    imageUrl: row.imageUrl ?? undefined,
    status: row.status as ProductStatus,
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    adminNote: row.adminNote ?? undefined,
  };
}

// Count-by-status folded into the {total, pending, approved, rejected} shape.
function foldStats(
  groups: { status: string; _count: { _all: number } }[],
): SubmissionStats {
  const count = (status: ProductStatus) =>
    groups.find((group) => group.status === status)?._count._all ?? 0;
  return {
    total: groups.reduce((sum, group) => sum + group._count._all, 0),
    pending: count("pending"),
    approved: count("approved"),
    rejected: count("rejected"),
  };
}

export async function getSubmissionStats(): Promise<SubmissionStats> {
  const groups = await prisma.product.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return foldStats(groups);
}

export const getUserProductStats = cache(
  async (userId: string): Promise<UserProductStats> => {
    const groups = await prisma.product.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    });
    return foldStats(groups);
  },
);

export async function getProductSubmissions(
  params: ProductListParams = {},
): Promise<ProductListResult> {
  const pageSize = params.pageSize ?? PRODUCT_PAGE_SIZE;
  const requestedPage = Math.max(1, params.page ?? 1);
  const status =
    params.status && params.status !== "all" ? params.status : undefined;
  const search = params.search?.trim();

  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { user: { is: { name: { contains: search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  // Count first so an out-of-range page (stale bookmark, hand-edited URL) clamps to the
  // last page and returns real rows instead of an empty table + nonsensical count.
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await prisma.product.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return { rows: rows.map(toSubmission), total, page, pageSize, totalPages };
}

// cache() dedupes within a request: the detail page reads this in both generateMetadata
// and the component (Prisma queries aren't request-memoized like fetch is).
export const getProductDetail = cache(
  async (id: string): Promise<ProductSubmission | null> => {
    const row = await prisma.product.findUnique({
      where: { id },
      include: { user: true },
    });
    return row ? toSubmission(row) : null;
  },
);
