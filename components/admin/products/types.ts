// Data shapes for the product-submissions admin area (/admin/products). Presentation
// components are driven entirely by these; live rows are mapped into them in
// lib/admin/products.ts, and mutations go through app/admin/products/actions.ts.

export type ProductStatus = "pending" | "approved" | "rejected";

export interface ProductUserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  joinedAt: string; // ISO
}

export interface ProductSubmission {
  id: string;
  user: ProductUserSummary;
  productName: string;
  price: number; // major units
  currency: string;
  quantity: number;
  imageUrl?: string;
  status: ProductStatus;
  submittedAt: string; // ISO
  updatedAt: string; // ISO
  adminNote?: string;
}

export interface SubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Same shape as SubmissionStats but scoped to one user (sidebar on the detail page).
export type UserProductStats = SubmissionStats;

export interface ProductListParams {
  search?: string;
  status?: ProductStatus | "all";
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  rows: ProductSubmission[];
  total: number; // total matching rows (across all pages)
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StatusFilterOption {
  value: ProductStatus | "all";
  label: string;
}
