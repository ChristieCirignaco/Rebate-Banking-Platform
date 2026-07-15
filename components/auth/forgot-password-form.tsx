"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import {
  AuthShell,
  AUTH_FIELD_CLASS,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Request a password-reset link. To avoid leaking which addresses have accounts, the
// request is always treated as a success (the "sent" confirmation is shown even when the
// server returns an error) — the one exception is a 429, which we surface so users know to
// wait rather than retry.
export function ForgotPasswordForm({ logoUrl }: { logoUrl?: string | null }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validate() {
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    setError(undefined);
    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !validate()) return;
    setIsLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });

    // Enumeration safety: any outcome moves to the sent state. A rate-limit is the only
    // case we flag, so the user waits instead of hammering the endpoint.
    if (error?.status === 429) {
      toast.error("Too many attempts. Please wait a few minutes.");
    }

    setIsLoading(false);
    setSent(true);
  }

  const footer = (
    <>
      Remembered it?{" "}
      <Link href="/login" className="font-bold text-white hover:underline">
        Back to sign in
      </Link>
    </>
  );

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <MailCheck className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              If an account exists for {email.trim()}, a reset link is on its way.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Back to sign in
            </Link>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError(undefined);
              }}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              Try another email
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(undefined);
                }}
                disabled={isLoading}
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                className={AUTH_FIELD_CLASS}
              />
              {error ? (
                <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}
            </div>

            <AuthSubmitButton loading={isLoading} loadingLabel="Sending…">
              Send reset link
            </AuthSubmitButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
