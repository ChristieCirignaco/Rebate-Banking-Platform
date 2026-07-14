import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DefaultBadge, RoleBadges, TypeBadge } from "./currency-badges";
import { CurrencyFlag } from "./currency-flag";
import { CurrencyFormDialog } from "./currency-form-dialog";
import { CurrencyStatusToggle } from "./status-toggle";
import { DeleteCurrencyDialog } from "./delete-currency-dialog";
import type { CurrencyItem } from "./types";

// Plain-decimal rate (no scientific notation, no sig-fig truncation); tiny crypto rates
// and large hyperinflation rates both render in full. Guards non-positive/non-finite.
function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(rate);
}

export function CurrencyTableRow({
  currency,
  defaultCode,
}: {
  currency: CurrencyItem;
  defaultCode: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <CurrencyFlag
            src={currency.flagUrl}
            code={currency.code}
            className="size-9"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium whitespace-nowrap">{currency.name}</span>
              {currency.isDefault ? <DefaultBadge /> : null}
            </div>
            <span className="text-muted-foreground text-xs">{currency.code}</span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <TypeBadge type={currency.type} />
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            1 {defaultCode} = {formatRate(currency.rate)} {currency.code}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <RoleBadges roles={currency.roles} />
      </TableCell>

      <TableCell>
        <CurrencyStatusToggle id={currency.id} active={currency.isActive} />
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <CurrencyFormDialog
            mode="update"
            currency={currency}
            defaultCode={defaultCode}
          >
            <Button size="sm" variant="outline">
              <Pencil className="size-4" />
              Manage
            </Button>
          </CurrencyFormDialog>
          <DeleteCurrencyDialog currency={currency}>
            <Button
              size="icon"
              variant="ghost"
              className="size-9 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
              title="Delete"
              aria-label={`Delete ${currency.code}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </DeleteCurrencyDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
