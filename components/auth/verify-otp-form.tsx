"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { resendLoginOtpAction, verifyLoginOtpAction } from "@/app/verify-otp/actions";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AUTH_FIELD_CLASS, AuthShell, AuthSubmitButton } from "@/components/auth/auth-shell";
import {
  RecaptchaField,
  type RecaptchaConfig,
  type RecaptchaHandle,
} from "@/components/auth/recaptcha-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN = 30;

// Mask an email for display: keep the first character of the local part, e.g. j•••@domain.com.
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}•••@${domain}`;
}

// App-owned owner-verification gate: after a password sign-in (when the admin has enabled
// login OTP), a regular user enters the 6-digit code emailed to them before the dashboard
// unlocks. Not a Better Auth plugin.
export function VerifyOtpForm({
  logoUrl,
  email,
  recaptcha,
}: {
  logoUrl?: string | null;
  email: string;
  /** The PUBLIC reCAPTCHA config (Settings → Plugins). The secret never crosses to the client. */
  recaptcha: RecaptchaConfig;
}) {
  const router = useRouter();
  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, startResend] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any running countdown on unmount (cleanup only — no synchronous state set here).
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCooldown() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCooldown(RESEND_COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setIsLoading(true);

    // Mint a captcha token if reCAPTCHA is on. getToken returns "" when it's off — the action
    // treats "" as a hard fail only while reCAPTCHA is enabled, so the disabled case needs no
    // special handling. For a v2 checkbox, "" means the user didn't tick the box; catch that here
    // for a clear message rather than a round-trip to the generic server error.
    const recaptchaToken = (await recaptchaRef.current?.getToken()) ?? "";
    if (recaptcha.enabled && recaptcha.version === "v2" && !recaptchaToken) {
      toast.error("Please confirm you're not a robot.");
      setIsLoading(false);
      return;
    }

    try {
      // A server action, not a Better Auth endpoint — the token is an argument, not a header.
      const r = await verifyLoginOtpAction(code, recaptchaToken);
      if (r.ok) {
        toast.success("Verified");
        // Hard navigation: the OTP gate is a security boundary, and a full load guarantees
        // the dashboard re-renders with the now-unlocked session. A client router.push right
        // after a server action leaves the router wedged (stuck on "Verifying…").
        window.location.href = "/dashboard";
        return; // keep the spinner while the page unloads
      }
      toast.error(r.error);
    } catch {
      // A server action can reject (DB hiccup, dropped RPC); never strand the spinner.
      toast.error("Something went wrong. Please try again.");
    }
    setIsLoading(false);
    // Every path that lands here stays on this page, and the token was already spent by the
    // action's verify call — clear it so a retry can mint a fresh one.
    recaptchaRef.current?.reset();
  }

  function onResend() {
    if (cooldown > 0 || isResending) return;
    startResend(async () => {
      // The resend action is guarded too, so it needs its own fresh token — a v2 token is
      // single-use and the verify attempt may already have spent the last one.
      const recaptchaToken = (await recaptchaRef.current?.getToken()) ?? "";
      if (recaptcha.enabled && recaptcha.version === "v2" && !recaptchaToken) {
        toast.error("Please confirm you're not a robot.");
        return;
      }
      try {
        const r = await resendLoginOtpAction(recaptchaToken);
        if (r.ok) {
          toast.success("A new code is on its way.");
          startCooldown();
        } else {
          toast.error(r.error);
        }
      } catch {
        toast.error("Couldn't send a new code. Please try again.");
      }
      // The page doesn't navigate on either outcome — clear the spent v2 token.
      recaptchaRef.current?.reset();
    });
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  const footer = (
    <>
      Not you?{" "}
      <button type="button" onClick={signOut} className="font-bold text-white hover:underline">
        Sign out
      </button>
    </>
  );

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <ShieldCheck className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Verify it&apos;s you</h1>
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code we sent to {maskEmail(email)}.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code" className="text-sm font-semibold">
            Verification code
          </Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError(undefined);
            }}
            disabled={isLoading}
            aria-invalid={!!error}
            aria-describedby={error ? "code-error" : undefined}
            className={cn(AUTH_FIELD_CLASS, "text-center text-2xl tracking-[0.5em]")}
          />
          {error ? (
            <p id="code-error" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <RecaptchaField ref={recaptchaRef} config={recaptcha} action="verify-otp" />

        <AuthSubmitButton loading={isLoading} loadingLabel="Verifying…">
          Verify
        </AuthSubmitButton>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Didn&apos;t get a code? </span>
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || isResending}
          className="font-semibold text-blue-600 hover:underline disabled:opacity-60 disabled:hover:no-underline dark:text-blue-400"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
        </button>
      </div>
    </AuthShell>
  );
}
