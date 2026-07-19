"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";

import { resolveLoginOutcome } from "@/app/login/actions";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  RecaptchaField,
  type RecaptchaConfig,
  type RecaptchaHandle,
} from "@/components/auth/recaptcha-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = {
  tone: "success" | "info" | "warning";
  icon: "check" | "mail" | "clock" | "alert";
  title: string;
  body: string;
};

// The persistent banner shown above the form: the registration-complete / email-verified
// confirmations (from the ?registered / ?verified markers a finished registration lands on)
// and the pending / suspended notices for an account that isn't active yet.
function initialNotice(params: URLSearchParams): Notice | null {
  if (params.get("registered")) {
    return {
      tone: "success",
      icon: "check",
      title: "Registration complete",
      body: "Registration completed successfully! We've emailed you a verification link — please confirm your email. Your account is then pending activation, please wait for approval.",
    };
  }
  if (params.get("verified")) {
    return {
      tone: "info",
      icon: "mail",
      title: "Email verified",
      body: "Your email is verified. Your account is pending approval — we'll email you once it's active.",
    };
  }
  const notice = params.get("notice") ?? (params.get("error") === "account_suspended" ? "suspended" : null);
  if (notice === "pending") {
    return {
      tone: "info",
      icon: "clock",
      title: "Account pending approval",
      body: "Your account is awaiting approval. We'll email you as soon as it's active.",
    };
  }
  if (notice === "suspended") {
    return {
      tone: "warning",
      icon: "alert",
      title: "Account not active",
      body: "Your account isn't active. If you think this is a mistake, please contact support.",
    };
  }
  return null;
}
// Post-login destinations we'll honor from ?redirect=. Same-origin paths only (a single
// leading slash, no "//" or "/\" that could become a protocol-relative open redirect), and
// limited to the user area — anything else falls back to the dashboard.
const REDIRECT_PREFIXES = ["/dashboard", "/account"];

function safeRedirect(param: string | null): string {
  if (!param || !/^\/[^/\\]/.test(param)) return "/dashboard";
  return REDIRECT_PREFIXES.some((p) => param === p || param.startsWith(`${p}/`))
    ? param
    : "/dashboard";
}

// Reference-style input: taller, more rounded, subtle fill, blue focus.
const FIELD_CLASS =
  "h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/40 dark:focus-visible:bg-slate-800";

// User sign-in. Hard-gated to non-admin accounts: an admin who authenticates here is
// signed straight back out and pointed at /admin/login, so an admin session can never be
// established through the user login.
export function UserLoginForm({
  logoUrl,
  recaptcha,
}: {
  logoUrl?: string | null;
  recaptcha: RecaptchaConfig;
}) {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(() => initialNotice(searchParams));

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
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

    const { data, error } = await authClient.signIn.email({
      email: email.trim(),
      password,
      rememberMe: remember,
      // The token rides as a header — that's what lib/auth's before-hook reads off the request.
      fetchOptions: { headers: { "x-captcha-response": recaptchaToken } },
    });
    if (error) {
      setIsLoading(false);
      toast.error(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Invalid credentials.",
      );
      // A v2 token is single-use and was consumed by the server's verify call, so the box must
      // be re-solved before another attempt — reset it rather than leave a spent checkmark.
      recaptchaRef.current?.reset();
      return;
    }

    // 2FA-enabled account: no session yet — the twoFactorClient hook navigates to the
    // challenge page. Bail so we don't race it to the dashboard.
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) return;

    // A session now exists. Decide server-side whether it's an active regular user; anything
    // else (admin / pending / suspended) is signed back out in the action and reported here so
    // no unapproved account ever holds a usable session.
    const outcome = await resolveLoginOutcome();
    if (outcome.kind === "active") {
      toast.success("Signed in");
      // Hard navigation: a client router.push right after a server action (resolveLoginOutcome)
      // leaves the router wedged on /login. A full load also guarantees the dashboard renders
      // with the fresh session.
      window.location.href = redirectTo;
      return; // keep the spinner while the page unloads
    }

    setIsLoading(false);
    // Every path from here stays on this page (admin / pending / suspended), and the token was
    // already spent by the sign-in we just made — clear it so a retry can mint a fresh one.
    recaptchaRef.current?.reset();
    if (outcome.kind === "admin") {
      toast.error("Administrators sign in at the admin login.");
      window.location.href = "/admin/login";
      return;
    }
    if (outcome.kind === "pending") {
      setNotice({
        tone: "info",
        icon: outcome.emailVerified ? "clock" : "mail",
        title: outcome.emailVerified ? "Account pending approval" : "Verify your email",
        body: outcome.emailVerified
          ? "Your account is awaiting approval. We'll email you as soon as it's active."
          : "Please verify your email to finish signing up (check your inbox for the link). Your account is then reviewed for approval.",
      });
      return;
    }
    if (outcome.kind === "suspended") {
      setNotice({
        tone: "warning",
        icon: "alert",
        title: "Account not active",
        body: "Your account isn't active. If you think this is a mistake, please contact support.",
      });
      return;
    }
    toast.error("Something went wrong. Please sign in again.");
  }

  const footer = (
    <>
      Don&apos;t have an account?{" "}
      <Link href="/register" className="font-bold text-white hover:underline">
        Create an Account
      </Link>
    </>
  );

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      {notice ? <NoticeBanner notice={notice} /> : null}

      <div className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">Sign in to continue to your dashboard</p>
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
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            disabled={isLoading}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={FIELD_CLASS}
          />
          {errors.email ? (
            <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              disabled={isLoading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={cn(FIELD_CLASS, "pr-11")}
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
          {errors.password ? (
            <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            disabled={isLoading}
          />
          <Label htmlFor="remember" className="text-sm font-medium">
            Remember me
          </Label>
        </div>

        <RecaptchaField ref={recaptchaRef} config={recaptcha} action="login" />

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/25 transition-all",
            "hover:from-blue-700 hover:to-indigo-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:opacity-70",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

const NOTICE_STYLES: Record<Notice["tone"], string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
};

const NOTICE_ICONS = {
  check: CheckCircle2,
  mail: MailCheck,
  clock: Clock,
  alert: AlertTriangle,
} as const;

// Persistent inline status banner (registration complete / pending / suspended). Uses an
// inline alert rather than a toast because these states must stay visible on the page.
function NoticeBanner({ notice }: { notice: Notice }) {
  const Icon = NOTICE_ICONS[notice.icon];
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border p-3.5 text-sm",
        NOTICE_STYLES[notice.tone],
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">{notice.title}</p>
        <p className="opacity-90">{notice.body}</p>
      </div>
    </div>
  );
}
