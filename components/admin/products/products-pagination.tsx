"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildProductsQuery } from "./products-query";

// Compact page list: first, last, current ± 1, with ellipses.
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i += 1
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

// Server-driven pagination: writes the `page` query param (dropped on page 1 so the
// canonical URL stays clean) while preserving the active search + status filter.
export function ProductsPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goTo = (target: number) =>
    router.push(
      pathname + buildProductsQuery(searchParams, { page: target <= 1 ? null : target }),
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="text-muted-foreground px-1.5"
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? "default" : "ghost"}
              size="icon"
              className="size-8"
              aria-current={entry === page ? "page" : undefined}
              onClick={() => goTo(entry)}
            >
              {entry}
            </Button>
          ),
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => goTo(page + 1)}
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
