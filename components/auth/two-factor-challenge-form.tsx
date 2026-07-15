"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  AUTH_FIELD_CLASS,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The 2FA sign-in challenge form. After a 2FA-enabled user enters their password, the
// twoFactorClient hook navigates here; the challenge is carried by a signed cookie, so
// there is no session yet. Two modes: authenticator TOTP (default) and backup code.
export function TwoFactorChallengeForm({ logoUrl }: { logoUrl?: string | null }) {
  const router = useRouter();

  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function switchMode(next: "totp" | "backup") {
    setMode(next);
    setCode("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !code.trim()) return;
    setIsLoading(true);

    const { error } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
        : await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice });

    if (error) {
      setIsLoading(false);
      // The challenge cookie expired — there's nothing left to verify against.
      if (error.code === "INVALID_TWO_FACTOR_COOKIE") {
        toast.error("Your session expired. Please sign in again.");
        router.push("/login");
        return;
      }
      toast.error("That code didn't match. Try again.");
      return;
    }

    // A session now exists — send them to the dashboard.
    router.push("/dashboard");
    router.refresh();
  }

  const footer = (
    <>
      Back to{" "}
      <Link href="/login" className="font-bold text-white hover:underline">
        sign in
      </Link>
    </>
  );

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          {mode === "totp" ? (
            <Smartphone className="size-6" />
          ) : (
            <ShieldCheck className="size-6" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Two-factor authentication
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your backup codes."}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {mode === "totp" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totp-code" className="text-sm font-semibold">
              Authentication code
            </Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              disabled={isLoading}
              autoFocus
              className={cn(AUTH_FIELD_CLASS, "text-center text-2xl tracking-[0.5em]")}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backup-code" className="text-sm font-semibold">
              Backup code
            </Label>
            <Input
              id="backup-code"
              autoComplete="one-time-code"
              placeholder="Enter a backup code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isLoading}
              autoFocus
              className={AUTH_FIELD_CLASS}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="trust-device"
            checked={trustDevice}
            onCheckedChange={(v) => setTrustDevice(v === true)}
            disabled={isLoading}
          />
          <Label htmlFor="trust-device" className="text-sm font-medium">
            Trust this device for 30 days
          </Label>
        </div>

        <AuthSubmitButton loading={isLoading} loadingLabel="Verifying…">
          Verify
        </AuthSubmitButton>
      </form>

      <div className="mt-6 text-center text-sm">
        {mode === "totp" ? (
          <button
            type="button"
            onClick={() => switchMode("backup")}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Lost your device? Use a backup code
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("totp")}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Use authenticator code
          </button>
        )}
      </div>
    </AuthShell>
  );
}
