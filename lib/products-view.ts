// Client-safe product presentation types + constants. NO prisma / server imports, so client
// components (the list rows, the detail dialog) can import these without pulling the DB layer
// into the browser bundle. The server-only queries live in lib/products.ts.

export const USER_PRODUCTS_PAGE_SIZE = 10;

export type ProductStatus = "pending" | "approved" | "rejected";

// Per-status presentation (badge pill + note box). dark: variants apply in the desktop
// dark-scoped list and are ignored in the light detail dialog — one definition covers both.
export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { label: string; badgeClass: string; noteClass: string }
> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    noteClass: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    noteClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    noteClass: "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300",
  },
};

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
  reviewedLabel: string | null; // review date, or null if not yet reviewed
};

export type UserProductsPage = {
  items: ProductRowView[];
  total: number;
  page: number;
  pageCount: number;
};
