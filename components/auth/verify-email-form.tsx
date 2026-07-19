"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
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
import {
  RecaptchaField,
  type RecaptchaConfig,
  type RecaptchaHandle,
} from "@/components/auth/recaptcha-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email-verification landing page. Better Auth's verify-email API flips emailVerified and
// redirects here as its callbackURL, so this page never verifies — it only reports the
// outcome. Failure lands here with ?error=token_expired|invalid_token (offer a resend).
// Two success shapes, because verification never signs the user in (autoSignInAfterVerification
// is off): a REGISTRATION verify carries ?registered=1 and has no session — we show the
// "pending approval" confirmation; an already-signed-in user re-verifying is recognized by
// their live session showing emailVerified, and gets a "go to dashboard" confirmation.
export function VerifyEmailForm({
  logoUrl,
  recaptcha,
}: {
  logoUrl?: string | null;
  /** The PUBLIC reCAPTCHA config (Settings → Plugins). The secret never crosses to the client. */
  recaptcha: RecaptchaConfig;
}) {
  const params = useSearchParams();
  const err = params.get("error");
  const registered = params.get("registered") === "1";
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const sessionEmail = sessionData?.user?.email;
  const verified = sessionData?.user?.emailVerified === true;

  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const footer = verified ? (
    <Link href="/dashboard" className="font-bold text-white hover:underline">
      Go to dashboard
    </Link>
  ) : (
    <Link href="/login" className="font-bold text-white hover:underline">
      Back to sign in
    </Link>
  );

  // Both resend entry points (the signed-in button and the email form) funnel through here, so
  // the captcha token is minted in one place and every send carries a fresh one.
  async function resend(target: string) {
    setIsLoading(true);

    // Mint a captcha token if reCAPTCHA is on. getToken returns "" when it's off — the auth
    // before-hook only treats "" as a failure while reCAPTCHA is enabled, so the disabled case
    // needs no special handling. For a v2 checkbox, "" means the user didn't tick the box; catch
    // that here for a clear message rather than a round-trip to the generic server error.
    const recaptchaToken = (await recaptchaRef.current?.getToken()) ?? "";
    if (recaptcha.enabled && recaptcha.version === "v2" && !recaptchaToken) {
      toast.error("Please confirm you're not a robot.");
      setIsLoading(false);
      return;
    }

    // A not-signed-in resend is the registration flow: keep the ?registered=1 marker so the
    // re-verified link lands on the "pending approval" success (a signed-in profile resend,
    // which has a session, resolves success via that session's emailVerified instead).
    const { error: sendError } = await authClient.sendVerificationEmail({
      email: target,
      callbackURL: sessionEmail ? "/verify-email" : "/verify-email?registered=1",
      // The token rides as a header — that's what lib/auth's before-hook reads off the request.
      fetchOptions: { headers: { "x-captcha-response": recaptchaToken } },
    });
    setIsLoading(false);
    // Either way we stay on this page and another resend is one click away, so clear the spent
    // v2 token — it's single-use and was already consumed by the server's verify call.
    recaptchaRef.current?.reset();
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

  // Registration verify success: no session (autoSignIn-after-verify is off), recognized by
  // the ?registered=1 marker Better Auth carried back from the callbackURL. The account is now
  // pending manual approval, so we route them to sign-in rather than the dashboard.
  if (!err && registered) {
    return (
      <AuthShell logoUrl={logoUrl} footer={footer}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Email verified</h1>
            <p className="text-muted-foreground text-sm">
              Thanks for confirming your email. Your registration is now under review — we&apos;ll
              email you once your account is approved, and then you can sign in.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
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
        // The signed-in branch has no <form>, but it hits the same guarded endpoint — it needs
        // its own widget so the ref is mounted and a token can be minted.
        <div className="flex flex-col gap-4">
          <RecaptchaField ref={recaptchaRef} config={recaptcha} action="verify-email" />
          <button
            type="button"
            onClick={() => resend(sessionEmail)}
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70"
          >
            Resend verification email
          </button>
        </div>
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

          <RecaptchaField ref={recaptchaRef} config={recaptcha} action="verify-email" />

          <AuthSubmitButton loading={isLoading} loadingLabel="Sending…">
            Send verification email
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
