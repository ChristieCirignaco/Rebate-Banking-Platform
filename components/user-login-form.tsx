"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// Reference-style input: taller, more rounded, subtle fill, blue focus.
const FIELD_CLASS =
  "h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/40 dark:focus-visible:bg-slate-800";

// User sign-in. Hard-gated to non-admin accounts: an admin who authenticates here is
// signed straight back out and pointed at /admin/login, so an admin session can never be
// established through the user login.
export function UserLoginForm({ logoUrl }: { logoUrl?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam?.startsWith("/dashboard") ? redirectParam : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

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

    const { error } = await authClient.signIn.email({
      email: email.trim(),
      password,
      rememberMe: remember,
    });
    if (error) {
      setIsLoading(false);
      toast.error(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Invalid credentials.",
      );
      return;
    }

    // Admins must use the admin login — undo the sign-in so no admin session is created here.
    const session = await authClient.getSession();
    const role = session.data?.user?.role ?? "";
    if (ADMIN_ROLES.has(role)) {
      await authClient.signOut();
      setIsLoading(false);
      toast.error("Administrators sign in at the admin login.");
      router.push("/admin/login");
      return;
    }

    toast.success("Signed in");
    router.push(redirectTo);
    router.refresh();
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
              href="/password/request"
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
