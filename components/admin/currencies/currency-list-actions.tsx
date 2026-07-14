"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CurrencyFormDialog } from "./currency-form-dialog";

export function CurrencyListActions({ defaultCode }: { defaultCode: string }) {
  return (
    <CurrencyFormDialog mode="create" defaultCode={defaultCode}>
      <Button>
        <Plus className="size-4" />
        Add Currency
      </Button>
    </CurrencyFormDialog>
  );
}
