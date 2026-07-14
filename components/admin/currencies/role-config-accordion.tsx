"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CURRENCY_ROLES, type CurrencyRoleKey, type FeeType } from "./types";

export interface RoleFormState {
  feeType: FeeType;
  feeValue: string;
  minAmount: string;
  maxAmount: string;
  enabled: boolean;
}

function AmountInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-12"
        />
        {suffix ? (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs uppercase">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RoleFields({
  label,
  state,
  onChange,
  symbol,
}: {
  label: string;
  state: RoleFormState;
  onChange: (patch: Partial<RoleFormState>) => void;
  symbol: string;
}) {
  const feeId = useId();
  const statusId = useId();
  return (
    <div className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={feeId}>Fee</Label>
        <div className="flex gap-2">
          <Input
            id={feeId}
            type="number"
            min="0"
            step="any"
            value={state.feeValue}
            onChange={(event) => onChange({ feeValue: event.target.value })}
          />
          <Select
            value={state.feeType}
            onValueChange={(value) => onChange({ feeType: value as FeeType })}
          >
            <SelectTrigger className="w-32" aria-label={`${label} fee type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent %</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="flex flex-col">
          <Label htmlFor={statusId}>Status</Label>
          <span className="text-muted-foreground text-xs">
            {state.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <Switch
          id={statusId}
          checked={state.enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
        />
      </div>

      <AmountInput
        label="Minimum Amount"
        value={state.minAmount}
        onChange={(value) => onChange({ minAmount: value })}
        suffix={symbol}
      />
      <AmountInput
        label="Maximum Amount"
        value={state.maxAmount}
        onChange={(value) => onChange({ maxAmount: value })}
        suffix={symbol}
      />
    </div>
  );
}

export function RoleConfigAccordion({
  roles,
  onChange,
  symbol,
}: {
  roles: Record<CurrencyRoleKey, RoleFormState>;
  onChange: (key: CurrencyRoleKey, patch: Partial<RoleFormState>) => void;
  symbol: string;
}) {
  // Native <details> so the browser owns the expand/collapse + keyboard + expanded
  // semantics (no manual aria-expanded needed).
  return (
    <div className="flex flex-col gap-2">
      {CURRENCY_ROLES.map(({ key, label }) => {
        const state = roles[key];
        return (
          <details key={key} className="group/role rounded-lg border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    state.enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                />
                {label}
                <span className="text-muted-foreground text-xs font-normal">
                  {state.enabled ? "On" : "Off"}
                </span>
              </span>
              <ChevronDown className="size-4 transition-transform group-open/role:rotate-180" />
            </summary>

            <RoleFields
              label={label}
              state={state}
              onChange={(patch) => onChange(key, patch)}
              symbol={symbol}
            />
          </details>
        );
      })}
    </div>
  );
}
