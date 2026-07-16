"use client";

import { type ReactNode, useId, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createDepositMethod,
  updateDepositMethod,
} from "@/app/admin/deposits/actions";
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
import { toast } from "@/lib/toast";
import { LogoUpload } from "./logo-upload";
import {
  MethodFieldBuilder,
  type FieldRow,
} from "./method-field-builder";
import { RichTextEditor } from "./rich-text-editor";
import type {
  ChargeType,
  CurrencyOption,
  DepositMethod,
  DepositMethodPayload,
  DepositMethodType,
  GatewayOption,
} from "./types";

function SuffixInput({
  id,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pr-14"
      />
      {suffix ? (
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs uppercase">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function DepositMethodDialog({
  methodType,
  method,
  currencies,
  gateways,
  children,
}: {
  methodType: DepositMethodType;
  method?: DepositMethod;
  currencies: CurrencyOption[];
  gateways: GatewayOption[];
  children: ReactNode;
}) {
  const router = useRouter();
  const uid = useId();
  const isManual = methodType === "manual";
  const mode = method ? "update" : "create";

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [logo, setLogo] = useState<string | null>(method?.logo ?? null);
  const [gatewayId, setGatewayId] = useState(method?.paymentGatewayId ?? "");
  const [currencyId, setCurrencyId] = useState(method?.currencyId ?? "");
  const [name, setName] = useState(method?.name ?? "");
  const [symbol, setSymbol] = useState(method?.symbol ?? "");
  const [methodCode, setMethodCode] = useState(method?.methodCode ?? "");
  const [rate, setRate] = useState(method ? String(method.rate) : "");
  const [chargeType, setChargeType] = useState<ChargeType>(method?.chargeType ?? "percent");
  const [chargeValue, setChargeValue] = useState(method ? String(method.chargeValue) : "0");
  const [minAmount, setMinAmount] = useState(method ? String(method.minAmount) : "0");
  const [maxAmount, setMaxAmount] = useState(method ? String(method.maxAmount) : "0");
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [fields, setFields] = useState<FieldRow[]>(
    () =>
      method?.fields.map((field) => ({
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options ?? [],
      })) ?? [],
  );
  const [instructions, setInstructions] = useState(method?.instructions ?? "");

  const currencyCode = currencies.find((c) => c.id === currencyId)?.code ?? "";

  function reset() {
    setLogo(method?.logo ?? null);
    setGatewayId(method?.paymentGatewayId ?? "");
    setCurrencyId(method?.currencyId ?? "");
    setName(method?.name ?? "");
    setSymbol(method?.symbol ?? "");
    setMethodCode(method?.methodCode ?? "");
    setRate(method ? String(method.rate) : "");
    setChargeType(method?.chargeType ?? "percent");
    setChargeValue(method ? String(method.chargeValue) : "0");
    setMinAmount(method ? String(method.minAmount) : "0");
    setMaxAmount(method ? String(method.maxAmount) : "0");
    setIsActive(method?.isActive ?? true);
    setFields(
      method?.fields.map((field) => ({
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options ?? [],
      })) ?? [],
    );
    setInstructions(method?.instructions ?? "");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset();
  }

  function handleCurrencyChange(id: string) {
    setCurrencyId(id);
    const currency = currencies.find((c) => c.id === id);
    if (currency) setSymbol(currency.symbol);
  }

  async function handleSubmit() {
    if (!name.trim()) return toast.error("Enter a method name.");
    if (!currencyId) return toast.error("Select a currency.");
    if (methodType === "auto" && !gatewayId) return toast.error("Select a payment gateway.");
    if (!symbol.trim()) return toast.error("Enter a currency symbol.");
    const rateValue = Number(rate);
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      return toast.error("Enter a conversion rate greater than zero.");
    }
    if (isManual && fields.some((field) => !field.label.trim())) {
      return toast.error("Give every custom field a label.");
    }

    const payload: DepositMethodPayload = {
      type: methodType,
      name: name.trim(),
      symbol: symbol.trim(),
      methodCode: isManual ? methodCode.trim() || null : null,
      logo,
      currencyId,
      paymentGatewayId: methodType === "auto" ? gatewayId || null : null,
      rate: rateValue,
      chargeType,
      chargeValue: Number(chargeValue) || 0,
      minAmount: Number(minAmount) || 0,
      maxAmount: Number(maxAmount) || 0,
      instructions: isManual ? instructions || null : null,
      isActive,
      fields: isManual
        ? fields.map((field) => ({
            label: field.label.trim(),
            type: field.type,
            required: field.required,
            options: field.options ?? [],
          }))
        : [],
    };

    setPending(true);
    try {
      const result = method
        ? await updateDepositMethod(method.id, payload)
        : await createDepositMethod(payload);
      if (result.ok) {
        toast.success(mode === "create" ? "Method created" : "Method updated");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isManual ? "Manual" : "Automatic"} Payment Method
          </DialogTitle>
          <DialogDescription>
            {isManual
              ? "Configure a manually-reviewed deposit method and the fields users submit."
              : "Configure an automatic deposit method backed by a payment gateway."}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <LogoUpload value={logo} onChange={setLogo} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {methodType === "auto" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${uid}-gateway`}>Payment Gateway</Label>
                <Select value={gatewayId || undefined} onValueChange={setGatewayId}>
                  <SelectTrigger id={`${uid}-gateway`}>
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {gateways.map((gateway) => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        {gateway.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-currency`}>Supported Currency</Label>
              <Select value={currencyId || undefined} onValueChange={handleCurrencyChange}>
                <SelectTrigger id={`${uid}-currency`}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code} — {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-name`}>Name</Label>
              <Input
                id={`${uid}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Bank Transfer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-symbol`}>Currency Symbol</Label>
              <Input
                id={`${uid}-symbol`}
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="$"
              />
            </div>

            {isManual ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${uid}-code`}>Method Code</Label>
                <Input
                  id={`${uid}-code`}
                  value={methodCode}
                  onChange={(event) => setMethodCode(event.target.value)}
                  placeholder="bank-transfer"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-rate`}>Conversion Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  1 USD =
                </span>
                <SuffixInput
                  id={`${uid}-rate`}
                  value={rate}
                  onChange={setRate}
                  suffix={currencyCode}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-charge`}>Charge</Label>
              <div className="flex gap-2">
                <Input
                  id={`${uid}-charge`}
                  type="number"
                  min="0"
                  step="any"
                  value={chargeValue}
                  onChange={(event) => setChargeValue(event.target.value)}
                />
                <Select
                  value={chargeType}
                  onValueChange={(value) => setChargeType(value as ChargeType)}
                >
                  <SelectTrigger className="w-28" aria-label="Charge type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent %</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-min`}>Minimum Deposit</Label>
              <SuffixInput
                id={`${uid}-min`}
                value={minAmount}
                onChange={setMinAmount}
                suffix={symbol}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-max`}>Maximum Deposit</Label>
              <SuffixInput
                id={`${uid}-max`}
                value={maxAmount}
                onChange={setMaxAmount}
                suffix={symbol}
              />
            </div>
          </div>

          {isManual ? (
            <>
              <MethodFieldBuilder fields={fields} onChange={setFields} />
              <div className="flex flex-col gap-1.5">
                <Label id={`${uid}-instructions`}>Receive Payment Details</Label>
                <RichTextEditor
                  defaultValue={instructions}
                  onChange={setInstructions}
                  ariaLabelledBy={`${uid}-instructions`}
                />
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
            <div className="flex flex-col">
              <Label htmlFor={`${uid}-status`}>Status</Label>
              <span className="text-muted-foreground text-xs">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <Switch
              id={`${uid}-status`}
              checked={isActive}
              onCheckedChange={setIsActive}
              aria-label="Method status"
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
            {pending ? "Saving…" : mode === "create" ? "Create" : "Update Payment Method"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
