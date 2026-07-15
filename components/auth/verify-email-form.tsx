"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import {
  AUTH_FIELD_CLASS,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email-verification landing page. Better Auth's verify-email API flips emailVerified and
// redirects here as its callbackURL, so this page never verifies — it only reports the
// outcome. Success lands here with no error (and the user is auto-signed-in); failure lands
// here with ?error=token_expired or ?error=invalid_token, where we offer to resend the link.
export function VerifyEmailForm({ logoUrl }: { logoUrl?: string | null }) {
  const err = useSearchParams().get("error");
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const sessionEmail = sessionData?.user?.email;
  // Success is a real state change, not merely the absence of an error param: Better Auth
  // flips emailVerified and (via autoSignInAfterVerification) signs the user in before
  // redirecting here, so we confirm the live session actually shows a verified email. A
  // direct visit by a logged-out or still-unverified user therefore does NOT show success.
  const verified = sessionData?.user?.emailVerified === true;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const footer = (
    <>
      <Link href="/dashboard" className="font-bold text-white hover:underline">
        Go to dashboard
      </Link>
    </>
  );

  async function resend(target: string) {
    setIsLoading(true);
    const { error: sendError } = await authClient.sendVerificationEmail({
      email: target,
      callbackURL: "/verify-email",
    });
    setIsLoading(false);
    if (sendError) {
      toast.error("Couldn't send the verification email. Please try again.");
      return;
    }
    toast.success("Verification email sent.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    await resend(trimmed);
  }

  // Success: the live session shows a verified email (Better Auth confirmed it server-side).
  if (!err && verified) {
    return (
      <AuthShell logoUrl={logoUrl} footer={footer}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Email verified</h1>
            <p className="text-muted-foreground text-sm">
              Your email address has been confirmed.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Go to dashboard
          </Link>
        </div>
      </AuthShell>
    );
  }

  // The real success flow signs the user in as it redirects here; wait for that session to
  // resolve before deciding, so a genuine confirmation never flashes the "verify" state.
  if (!err && sessionPending) {
    return (
      <AuthShell logoUrl={logoUrl} footer={footer}>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  // Not verified — either the link was expired/invalid (?error=) or the address simply isn't
  // confirmed yet. Either way, offer to resend a fresh link.
  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
          <AlertTriangle className="size-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {err ? "Verification failed" : "Verify your email"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {err
              ? "This verification link has expired or is no longer valid. Request a new link below and we'll email it to you."
              : "Your email address isn't confirmed yet. Request a verification link below and we'll email it to you."}
          </p>
        </div>
      </div>

      {sessionEmail ? (
        <button
          type="button"
          onClick={() => resend(sessionEmail)}
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70"
        >
          Resend verification email
        </button>
      ) : (
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
            Send verification email
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
