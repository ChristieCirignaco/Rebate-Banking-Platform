"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, Info, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GATEWAY_CONFIGS,
  type GatewayFieldDef,
} from "@/lib/payment-gateways/config";
import { toast } from "@/lib/toast";
import type { PaymentGatewayView } from "./types";

function GatewayField({
  field,
  value,
  isSet,
  onChange,
}: {
  field: GatewayFieldDef;
  value: string;
  isSet: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [reveal, setReveal] = useState(false);

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{field.label}</Label>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const isPassword = field.type === "password";
  const inputType = isPassword
    ? reveal
      ? "text"
      : "password"
    : field.type === "email"
      ? "email"
      : "text";
  const placeholder = field.sensitive
    ? isSet
      ? "•••••••• — leave blank to keep"
      : (field.placeholder ?? "Not set")
    : field.placeholder;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{field.label}</Label>
        {field.sensitive ? (
          <span className="text-muted-foreground text-xs">
            {isSet ? "Set" : "Not set"}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? "new-password" : "off"}
          spellCheck={false}
          className={isPassword ? "pr-10" : undefined}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Hide value" : "Show value"}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center outline-none"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function initialValues(gateway: PaymentGatewayView): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of GATEWAY_CONFIGS[gateway.slug].fields) {
    // Non-sensitive fields pre-fill; sensitive fields start blank (keep current unless typed).
    values[field.key] = field.sensitive ? "" : (gateway.values[field.key] ?? "");
  }
  return values;
}

export function ManageGatewayDialog({ gateway }: { gateway: PaymentGatewayView }) {
  const router = useRouter();
  const config = GATEWAY_CONFIGS[gateway.slug];
  const nameId = useId();
  const statusId = useId();
  const webhookId = useId();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(gateway.status === "active");
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(gateway),
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setActive(gateway.status === "active");
      setValues(initialValues(gateway));
    }
  }

  async function copyWebhook() {
    if (!gateway.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(gateway.webhookUrl);
      toast.success("Webhook URL copied");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  async function handleSubmit() {
    const credentials: Record<string, string> = {};
    for (const field of config.fields) {
      const value = values[field.key] ?? "";
      if (field.sensitive) {
        if (value.trim()) credentials[field.key] = value.trim(); // only changed secrets
      } else {
        credentials[field.key] = value;
      }
    }

    setPending(true);
    try {
      const response = await fetch(`/api/admin/payment-gateways/${gateway.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: active ? "active" : "inactive",
          credentials,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        toast.success(`${gateway.name} updated`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? "Update failed. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Settings2 className="size-4" />
              Manage
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Manage Gateway Credentials and Others</TooltipContent>
      </Tooltip>

      <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>Update Payment Gateway</DialogTitle>
          <DialogDescription>
            Credentials are encrypted at rest. Leave a secret field blank to keep its
            current value.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>Gateway Name</Label>
            <Input id={nameId} value={gateway.name} readOnly className="bg-muted" />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
            <div className="flex flex-col">
              <Label htmlFor={statusId}>Status</Label>
              <span className="text-muted-foreground text-xs">
                {active ? "Active" : "Inactive"}
              </span>
            </div>
            <Switch
              id={statusId}
              checked={active}
              onCheckedChange={setActive}
              aria-label="Gateway status"
            />
          </div>

          {config.fields.map((field) => (
            <GatewayField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              isSet={Boolean(gateway.secretsSet[field.key])}
              onChange={(value) =>
                setValues((current) => ({ ...current, [field.key]: value }))
              }
            />
          ))}

          {config.hasWebhook && gateway.webhookUrl ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor={webhookId}>Webhook URL</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Webhook URL info"
                      className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <Badge variant="outline" className="cursor-pointer gap-1">
                        <Info className="size-3" />
                        Info
                      </Badge>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 text-xs">
                    Set this as the IPN/webhook URL in your {gateway.name} dashboard so we
                    receive payment notifications.
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Input
                  id={webhookId}
                  value={gateway.webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={copyWebhook}
                  aria-label="Copy webhook URL"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
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
            {pending ? "Updating…" : "Update Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
