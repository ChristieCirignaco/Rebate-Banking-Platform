"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
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

// Set a new password from the emailed link. Better Auth's API validates the token then
// redirects here with ?token=<valid> (success) or ?error=INVALID_TOKEN (bad/expired), so
// we read both from the URL and branch to an "invalid link" state when the token is missing.
export function ResetPasswordForm({
  logoUrl,
  recaptcha,
}: {
  logoUrl?: string | null;
  /** The PUBLIC reCAPTCHA config (Settings → Plugins). The secret never crosses to the client. */
  recaptcha: RecaptchaConfig;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const err = params.get("error");

  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirm?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const footer = (
    <>
      Back to{" "}
      <Link href="/login" className="font-bold text-white hover:underline">
        sign in
      </Link>
    </>
  );

  // Invalid / expired link: nothing to submit — point the user at a fresh request.
  if (err || !token) {
    return (
      <AuthShell logoUrl={logoUrl} footer={footer}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">Link expired</h1>
            <p className="text-muted-foreground text-sm">
              This reset link is invalid or has expired.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  function validate() {
    const next: { newPassword?: string; confirm?: string } = {};
    if (newPassword.length < 8) next.newPassword = "Password must be at least 8 characters.";
    if (confirm !== newPassword) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !validate()) return;
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

    const { error } = await authClient.resetPassword({
      newPassword,
      token: token!,
      // The token rides as a header — that's what lib/auth's before-hook reads off the request.
      fetchOptions: { headers: { "x-captcha-response": recaptchaToken } },
    });
    if (error) {
      setIsLoading(false);
      toast.error(error.message ?? "Could not reset password. The link may have expired.");
      // A v2 token is single-use and was consumed by the server's verify call, so the box must
      // be re-solved before another attempt — reset it rather than leave a spent checkmark.
      recaptchaRef.current?.reset();
      return;
    }

    toast.success("Password updated. Please sign in.");
    router.push("/login");
  }

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      <div className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground text-sm">
          Choose a strong password to secure your account.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password" className="text-sm font-semibold">
            New Password
          </Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (errors.newPassword) setErrors((e) => ({ ...e, newPassword: undefined }));
              }}
              disabled={isLoading}
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? "new-password-error" : undefined}
              className={cn(AUTH_FIELD_CLASS, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.newPassword ? (
            <p id="new-password-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.newPassword}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password" className="text-sm font-semibold">
            Confirm Password
          </Label>
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (errors.confirm) setErrors((e) => ({ ...e, confirm: undefined }));
            }}
            disabled={isLoading}
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
            className={AUTH_FIELD_CLASS}
          />
          {errors.confirm ? (
            <p id="confirm-password-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.confirm}
            </p>
          ) : null}
        </div>

        <RecaptchaField ref={recaptchaRef} config={recaptcha} action="reset-password" />

        <AuthSubmitButton loading={isLoading} loadingLabel="Updating…">
          Reset password
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
