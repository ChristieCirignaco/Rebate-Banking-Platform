"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DepositMethodDialog } from "./deposit-method-dialog";
import { DepositMethodsTable } from "./deposit-methods-table";
import type {
  CurrencyOption,
  DepositMethod,
  DepositMethodType,
  GatewayOption,
} from "./types";

export function MethodsTab({
  methodType,
  methods,
  currencies,
  gateways,
}: {
  methodType: DepositMethodType;
  methods: DepositMethod[];
  currencies: CurrencyOption[];
  gateways: GatewayOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {methodType === "auto"
            ? "Gateway-backed methods credited automatically after payment."
            : "Manually-reviewed deposit methods with custom user fields."}
        </p>
        <DepositMethodDialog
          methodType={methodType}
          currencies={currencies}
          gateways={gateways}
        >
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" />
            Create {methodType === "auto" ? "Automatic" : "Manual"} Method
          </Button>
        </DepositMethodDialog>
      </div>

      <Card className="overflow-hidden py-0">
        <DepositMethodsTable
          methodType={methodType}
          methods={methods}
          currencies={currencies}
          gateways={gateways}
        />
      </Card>
    </div>
  );
}
