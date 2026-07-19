"use client";

import { type ReactNode, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";

import {
  createCurrency,
  updateCurrency,
} from "@/app/admin/currencies/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { currencyOptions, findCurrencyOption } from "@/lib/currency-data";
import { toast } from "@/lib/toast";
import { FlagUpload } from "./flag-upload";
import { RoleConfigAccordion, type RoleFormState } from "./role-config-accordion";
import {
  CURRENCY_ROLES,
  type CurrencyFormPayload,
  type CurrencyItem,
  type CurrencyRoleKey,
  type CurrencyType,
} from "./types";

type RolesState = Record<CurrencyRoleKey, RoleFormState>;

function initialRoles(currency?: CurrencyItem): RolesState {
  const state = {} as RolesState;
  for (const { key } of CURRENCY_ROLES) {
    const existing = currency?.roles.find((role) => role.role === key);
    state[key] = existing
      ? {
          feeType: existing.feeType,
          feeValue: String(existing.feeValue),
          minAmount: String(existing.minAmount),
          maxAmount: String(existing.maxAmount),
          enabled: existing.enabled,
        }
      : { feeType: "percent", feeValue: "0", minAmount: "0", maxAmount: "0", enabled: true };
  }
  return state;
}

function ToggleField({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
}) {
  // Controlled tooltip so a tap (which Radix tooltips ignore) also opens the help.
  const [tipOpen, setTipOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        {tooltip ? (
          <Tooltip open={tipOpen} onOpenChange={setTipOpen}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`${label} help`}
                onClick={() => setTipOpen((open) => !open)}
              >
                <CircleHelp className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-48 text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function CurrencyFormDialog({
  mode,
  currency,
  defaultCode,
  children,
}: {
  mode: "create" | "update";
  currency?: CurrencyItem;
  defaultCode: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [type, setType] = useState<CurrencyType | "">(currency?.type ?? "");
  const [selectedCode, setSelectedCode] = useState(currency?.code ?? "");
  const [name, setName] = useState(currency?.name ?? "");
  const [code, setCode] = useState(currency?.code ?? "");
  const [symbol, setSymbol] = useState(currency?.symbol ?? "");
  const [rate, setRate] = useState(currency ? String(currency.rate) : "");
  const [flagUrl, setFlagUrl] = useState<string | null>(currency?.flagUrl ?? null);
  const [autoWallet, setAutoWallet] = useState(currency?.autoWallet ?? false);
  const [isDefault, setIsDefault] = useState(currency?.isDefault ?? false);
  const [isActive, setIsActive] = useState(currency?.isActive ?? true);
  const [roles, setRoles] = useState<RolesState>(() => initialRoles(currency));

  const options = type ? currencyOptions(type) : [];
  // Keep the current selection visible even if it isn't in the ISO list (custom code).
  const nameOptions =
    selectedCode && !options.some((option) => option.code === selectedCode)
      ? [{ code: selectedCode, name: name || selectedCode, symbol }, ...options]
      : options;

  function reset() {
    setType(currency?.type ?? "");
    setSelectedCode(currency?.code ?? "");
    setName(currency?.name ?? "");
    setCode(currency?.code ?? "");
    setSymbol(currency?.symbol ?? "");
    setRate(currency ? String(currency.rate) : "");
    setFlagUrl(currency?.flagUrl ?? null);
    setAutoWallet(currency?.autoWallet ?? false);
    setIsDefault(currency?.isDefault ?? false);
    setIsActive(currency?.isActive ?? true);
    setRoles(initialRoles(currency));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset();
  }

  function handleTypeChange(next: CurrencyType) {
    setType(next);
    setSelectedCode("");
    setName("");
    setCode("");
    setSymbol("");
  }

  function handleNameChange(optionCode: string) {
    setSelectedCode(optionCode);
    const option = type ? findCurrencyOption(type, optionCode) : undefined;
    if (option) {
      setName(option.name);
      setCode(option.code);
      setSymbol(option.symbol);
    } else {
      setCode(optionCode);
    }
  }

  function patchRole(key: CurrencyRoleKey, patch: Partial<RoleFormState>) {
    setRoles((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  async function handleSubmit() {
    if (!type) return toast.error("Select a currency type.");
    if (!name || !code.trim() || !symbol.trim()) {
      return toast.error("Select a currency and fill in the code and symbol.");
    }
    const rateValue = Number(rate);
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      return toast.error("Enter a conversion rate greater than zero.");
    }

    const payload: CurrencyFormPayload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      symbol: symbol.trim(),
      type,
      flagUrl,
      rate: rateValue,
      autoWallet,
      isDefault,
      isActive,
      roles: CURRENCY_ROLES.map(({ key }) => ({
        role: key,
        feeType: roles[key].feeType,
        feeValue: Number(roles[key].feeValue) || 0,
        minAmount: Number(roles[key].minAmount) || 0,
        maxAmount: Number(roles[key].maxAmount) || 0,
        enabled: roles[key].enabled,
      })),
    };

    setPending(true);
    try {
      const result =
        mode === "create"
          ? await createCurrency(payload)
          : await updateCurrency(currency!.id, payload);
      if (result.ok) {
        toast.success(mode === "create" ? "Currency created" : "Currency updated");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const rateSuffix = code || selectedCode;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Currency" : "Update Currency"}
          </DialogTitle>
          <DialogDescription>
            Configure the currency, its conversion rate, wallet behavior, and
            per-role fees and limits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FlagUpload value={flagUrl} onChange={setFlagUrl} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-type`}>Currency Type</Label>
              <Select
                value={type || undefined}
                onValueChange={(value) => handleTypeChange(value as CurrencyType)}
              >
                <SelectTrigger id={`${uid}-type`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiat">Fiat</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-name`}>Currency Name</Label>
              <Select
                value={selectedCode || undefined}
                onValueChange={handleNameChange}
                disabled={!type}
              >
                <SelectTrigger id={`${uid}-name`}>
                  <SelectValue
                    placeholder={type ? "Select currency" : "First select currency type"}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {nameOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.code} — {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-code`}>Code</Label>
              <Input
                id={`${uid}-code`}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-symbol`}>Symbol</Label>
              <Input
                id={`${uid}-symbol`}
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="$"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-rate`}>Conversion Rate</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                1 {defaultCode} =
              </span>
              <div className="relative flex-1">
                <Input
                  id={`${uid}-rate`}
                  type="number"
                  min="0"
                  step="any"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="0.00"
                  className="pr-16"
                />
                {rateSuffix ? (
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs uppercase">
                    {rateSuffix}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ToggleField
              label="Auto Wallet"
              checked={autoWallet}
              onChange={setAutoWallet}
              tooltip="Automatically create a wallet in this currency for every new user."
            />
            <ToggleField label="Default" checked={isDefault} onChange={setIsDefault} />
            <ToggleField label="Status" checked={isActive} onChange={setIsActive} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium"># Role with Fee and Limit Management</p>
            <RoleConfigAccordion
              roles={roles}
              onChange={patchRole}
              symbol={symbol || rateSuffix}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create Now" : "Update Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
