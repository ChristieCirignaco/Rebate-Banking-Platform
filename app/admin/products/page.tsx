import type { Metadata } from "next";
import { Box, CheckCircle2, Clock, XCircle } from "lucide-react";

import { StatCards } from "@/components/admin/overview/stat-card";
import type { StatWidget } from "@/components/admin/overview/types";
import { ProductsPagination } from "@/components/admin/products/products-pagination";
import { ProductsTable } from "@/components/admin/products/products-table";
import { ProductsToolbar } from "@/components/admin/products/products-toolbar";
import type { ProductStatus } from "@/components/admin/products/types";
import { Card } from "@/components/ui/card";
import { getProductSubmissions, getSubmissionStats } from "@/lib/admin/products";

export const metadata: Metadata = { title: "Product Submissions" };

function asStatus(value?: string): ProductStatus | "all" {
  return value === "pending" || value === "approved" || value === "rejected"
    ? value
    : "all";
}

function asPage(value?: string): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    user?: string;
  }>;
}) {
  const sp = await searchParams;

  const [stats, list] = await Promise.all([
    getSubmissionStats(),
    getProductSubmissions({
      page: asPage(sp.page),
      search: sp.q,
      status: asStatus(sp.status),
      userId: sp.user,
    }),
  ]);

  const widgets: StatWidget[] = [
    {
      label: "Pending Review",
      value: stats.pending,
      icon: Clock,
      tint: "amber",
      href: "/admin/products?status=pending",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      tint: "emerald",
      href: "/admin/products?status=approved",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      tint: "rose",
      href: "/admin/products?status=rejected",
    },
    {
      label: "Total Submissions",
      value: stats.total,
      icon: Box,
      tint: "blue",
      href: "/admin/products",
    },
  ];

  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.total, list.page * list.pageSize);

  return (
    <>
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Submissions
        </h1>
        <p className="text-muted-foreground text-sm">
          Review rebate products users submitted for approval.
        </p>
      </div>

      <StatCards widgets={widgets} />

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <ProductsToolbar />

        <Card className="overflow-hidden py-0">
          <ProductsTable products={list.rows} />
        </Card>

        {list.total > 0 ? (
          <p className="text-muted-foreground text-sm">
            {`Showing ${from}–${to} of ${list.total} submissions`}
          </p>
        ) : null}

        <ProductsPagination page={list.page} totalPages={list.totalPages} />
      </div>
    </>
  );
}
