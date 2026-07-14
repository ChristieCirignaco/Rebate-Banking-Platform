"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WithdrawMethodDialog } from "./withdraw-method-dialog";
import { WithdrawMethodsTable } from "./withdraw-methods-table";
import type {
  CurrencyOption,
  GatewayOption,
  WithdrawMethod,
  WithdrawMethodType,
} from "./types";

export function WithdrawMethodsTab({
  methodType,
  methods,
  currencies,
  gateways,
}: {
  methodType: WithdrawMethodType;
  methods: WithdrawMethod[];
  currencies: CurrencyOption[];
  gateways: GatewayOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {methodType === "auto"
            ? "Gateway-backed methods processed automatically."
            : "Manually-processed withdrawal methods with custom user fields."}
        </p>
        <WithdrawMethodDialog
          methodType={methodType}
          currencies={currencies}
          gateways={gateways}
        >
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" />
            Create {methodType === "auto" ? "Automatic" : "Manual"} Method
          </Button>
        </WithdrawMethodDialog>
      </div>

      <Card className="overflow-hidden py-0">
        <WithdrawMethodsTable
          methodType={methodType}
          methods={methods}
          currencies={currencies}
          gateways={gateways}
        />
      </Card>
    </div>
  );
}
