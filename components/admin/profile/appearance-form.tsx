"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun, desc: "Always use the light theme." },
  { value: "dark", label: "Dark", Icon: Moon, desc: "Always use the dark theme." },
  { value: "system", label: "System", Icon: Monitor, desc: "Match your device setting." },
] as const;

// Mirrors the header theme toggle. next-themes persists the choice per-device (localStorage),
// so this is intentionally described as device-scoped rather than a saved account setting.
export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? (theme ?? "system") : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose how the admin panel looks. Saved on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map(({ value, label, Icon, desc }) => {
            const selected = active === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={selected}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-primary ring-primary/30 ring-2"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {selected ? (
                  <Check className="text-primary absolute top-3 right-3 size-4" />
                ) : null}
                <Icon className="size-5" />
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground text-xs">{desc}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
