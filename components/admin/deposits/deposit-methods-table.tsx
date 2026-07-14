import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { chargeLabel, MethodStatusBadge } from "./deposit-badges";
import { DeleteMethodDialog } from "./delete-method-dialog";
import { DepositMethodDialog } from "./deposit-method-dialog";
import { MethodLogo } from "./method-logo";
import type {
  CurrencyOption,
  DepositMethod,
  DepositMethodType,
  GatewayOption,
} from "./types";

function rateSummary(min: number, max: number, symbol: string): string {
  return `${symbol}${formatNumber(min)} – ${symbol}${formatNumber(max)}`;
}

export function DepositMethodsTable({
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Logo</TableHead>
          <TableHead>Name / Currency</TableHead>
          <TableHead>Min / Max</TableHead>
          <TableHead>Rate Type / Rate</TableHead>
          <TableHead>Charge</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {methods.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
              No {methodType} methods yet.
            </TableCell>
          </TableRow>
        ) : (
          methods.map((method) => (
            <TableRow key={method.id}>
              <TableCell>
                <MethodLogo
                  logo={method.logo}
                  gatewayLogo={method.gatewayLogo}
                  name={method.name}
                  className="size-10"
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium whitespace-nowrap">{method.name}</span>
                  <Badge variant="secondary" className="w-fit font-mono text-xs">
                    {method.currencyCode}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {rateSummary(method.minAmount, method.maxAmount, method.symbol)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm capitalize">
                    {method.chargeType === "percent" ? "Percentage" : "Fixed"}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    1 USD = {method.rate} {method.currencyCode}
                  </span>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">
                {chargeLabel(method.chargeType, method.chargeValue, method.symbol)}
              </TableCell>
              <TableCell>
                <MethodStatusBadge active={method.isActive} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <DepositMethodDialog
                    methodType={methodType}
                    method={method}
                    currencies={currencies}
                    gateways={gateways}
                  >
                    <Button size="sm" variant="outline">
                      <Pencil className="size-4" />
                      Manage
                    </Button>
                  </DepositMethodDialog>
                  <DeleteMethodDialog method={method}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                      title="Delete method"
                      aria-label={`Delete ${method.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </DeleteMethodDialog>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
