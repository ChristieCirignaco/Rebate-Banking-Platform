"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_STATUS_OPTIONS,
  EMAIL_OPTIONS,
  KYC_OPTIONS,
} from "./filter-options";
import type { SelectOption, UserFilters } from "./types";

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full lg:w-40" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UsersFilterBar({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  onSearchSubmit,
}: {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit?.();
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 xl:flex">
          <FilterSelect
            value={filters.accountStatus}
            onChange={(value) =>
              onFiltersChange({
                ...filters,
                accountStatus: value as UserFilters["accountStatus"],
              })
            }
            options={ACCOUNT_STATUS_OPTIONS}
            placeholder="Account Status"
          />
          <FilterSelect
            value={filters.kyc}
            onChange={(value) =>
              onFiltersChange({ ...filters, kyc: value as UserFilters["kyc"] })
            }
            options={KYC_OPTIONS}
            placeholder="KYC Status"
          />
          <FilterSelect
            value={filters.email}
            onChange={(value) =>
              onFiltersChange({
                ...filters,
                email: value as UserFilters["email"],
              })
            }
            options={EMAIL_OPTIONS}
            placeholder="Email Status"
          />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 xl:w-72">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, username, email…"
            aria-label="Search users"
          />
          <Button
            type="submit"
            size="icon"
            variant="secondary"
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
