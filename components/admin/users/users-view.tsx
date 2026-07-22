"use client";

import * as React from "react";

import { Card } from "@/components/ui/card";
import { Pagination } from "./pagination";
import { UsersFilterBar } from "./users-filter-bar";
import { UsersTable } from "./users-table";
import type { AdminUser, UserFilters } from "./types";

const PAGE_SIZE = 8;

const DEFAULT_FILTERS: UserFilters = {
  accountStatus: "all",
  kyc: "all",
  email: "all",
};

function matches(
  user: AdminUser,
  filters: UserFilters,
  search: string,
): boolean {
  if (
    filters.accountStatus !== "all" &&
    user.accountStatus !== filters.accountStatus
  )
    return false;
  if (filters.kyc !== "all" && user.kycStatus !== filters.kyc) return false;
  if (filters.email !== "all" && user.emailStatus !== filters.email)
    return false;

  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [user.name, user.username, user.email];
    if (!haystack.some((value) => value.toLowerCase().includes(query)))
      return false;
  }
  return true;
}

// Client state (filters/search/page) over the passed users. Filtering/pagination is
// local for now; swap the in-memory filter for a server query to wire real data.
export function UsersView({
  users,
  canDelete,
}: {
  users: AdminUser[];
  canDelete: boolean;
}) {
  const [filters, setFilters] = React.useState<UserFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(
    () => users.filter((user) => matches(user, filters, search)),
    [users, filters, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Reset to the first page in the change handlers (not an effect) so filtering never
  // leaves the view on an out-of-range page.
  function handleFiltersChange(next: UserFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <UsersFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        search={search}
        onSearchChange={handleSearchChange}
      />

      <Card className="overflow-hidden py-0">
        <UsersTable users={pageUsers} canDelete={canDelete} />
      </Card>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
