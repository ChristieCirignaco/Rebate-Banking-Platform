"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_FILTERS } from "./filter-options";
import { buildProductsQuery } from "./products-query";

const SEARCH_DEBOUNCE_MS = 400;

// Server-driven search + status filter: every change writes the query string and the
// server component re-renders with the filtered/paged data. Search or status change
// always returns to page 1.
export function ProductsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "all";
  const urlQuery = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  // The last q value this component pushed. Held as state (not a ref) so it can be read
  // during render to tell our own navigations from external ones (back/forward, a
  // stat-card link): only external changes reflect into the input, so we never clobber
  // what the user is mid-typing.
  const [sentQuery, setSentQuery] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (urlQuery !== sentQuery) setSearch(urlQuery);
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Build from the LIVE url (read at call time) so a filter/back/forward change made
  // during a debounce window is preserved rather than clobbered by a stale snapshot.
  function navigate(
    updates: Record<string, string | number | null>,
    replace = false,
  ) {
    const live =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : searchParams;
    const url = pathname + buildProductsQuery(live, { page: null, ...updates });
    if (replace) router.replace(url);
    else router.push(url);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentQuery(value.trim());
      navigate({ q: value.trim() || null }, true);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSentQuery(search.trim());
    navigate({ q: search.trim() || null });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter submissions by status"
          className="bg-muted flex overflow-x-auto rounded-lg p-1"
        >
          {STATUS_FILTERS.map((filter) => {
            const active = currentStatus === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  navigate({
                    status: filter.value === "all" ? null : filter.value,
                  })
                }
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:flex-none",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
                {active ? <span className="sr-only"> (selected)</span> : null}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 lg:w-80">
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by user or product name"
            aria-label="Search product submissions"
          />
          <Button type="submit" size="icon" variant="secondary" aria-label="Search">
            <Search className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
