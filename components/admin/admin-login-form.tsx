"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, LogIn } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import {
  RecaptchaField,
  type RecaptchaConfig,
  type RecaptchaHandle,
} from "@/components/auth/recaptcha-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// Admin sign-in. Hard-gated to admin-tier accounts: a non-admin who authenticates here is
// immediately signed back out so a regular user can never establish an admin session
// through this form (they use /login instead). Its distinct two-panel look is intentional
// — it keeps the admin entry visually separate from the user login.
export function AdminLoginForm({
  brandName,
  logoUrl,
  imageUrl,
  recaptcha,
}: {
  /** General → brand name. Passed in rather than hardcoded so renaming the site in Settings
   *  actually renames it here — the same reason the tab title reads from settings. */
  brandName: string;
  /** Branding → logo, centred above the form. Falls back to the brand mark when unset. */
  logoUrl?: string | null;
  /** Optional artwork for the left panel. The repo ships no admin illustration, so without
   *  one the panel renders a designed gradient rather than a broken <img>. Drop a file in
   *  /public and pass its path to use a real image. */
  imageUrl?: string | null;
  /** The PUBLIC reCAPTCHA config (Settings → Plugins). The secret never crosses to the client. */
  recaptcha: RecaptchaConfig;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/admin";

  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
      // The token rides as a header — that's what lib/auth's before-hook reads off the request.
      fetchOptions: { headers: { "x-captcha-response": recaptchaToken } },
    });
    if (error) {
      setIsLoading(false);
      toast.error(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Invalid email or password.",
      );
      // A v2 token is single-use and was consumed by the server's verify call, so the box must
      // be re-solved before another attempt — reset it rather than leave a spent checkmark.
      recaptchaRef.current?.reset();
      return;
    }

    // Confirm the account is admin-tier; if not, undo the sign-in so no admin session sticks.
    const session = await authClient.getSession();
    const role = session.data?.user?.role ?? "";
    if (!ADMIN_ROLES.has(role)) {
      await authClient.signOut();
      setIsLoading(false);
      toast.error("This sign-in is for administrators. Please use the main login.");
      // We stay on this page and the token was already spent by the sign-in above — clear it so
      // a retry can mint a fresh one.
      recaptchaRef.current?.reset();
      return;
    }

    toast.success("Signed in");
    router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:min-h-[500px] md:grid-cols-2">
          {/* Left — artwork. Hidden below md so the form gets the full width on a phone;
              `order-first` is not needed since it already precedes the form in the DOM. */}
          <div className="relative hidden md:block">
            {imageUrl ? (
              // absolute, not just h-full: the parent's height is auto (set by the form column),
              // so an in-flow img contributes its own intrinsic height and a portrait asset
              // stretches the whole card. Out of flow it crops to whatever the form needs.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <PanelArtwork brandName={brandName} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50" />
            {/* Full-bleed translucent band, mirroring the reference's
                `bg-dark p-2 opacity-75 text-center w-100`. Tailwind's bg-black/75 rather than
                opacity-75: Bootstrap's opacity fades the TEXT along with the bar, where this
                keeps the band translucent and the caption fully opaque. */}
            <h2 className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 bg-black/75 p-2 text-center text-4xl font-bold text-white">
              Administration
            </h2>
          </div>

          {/* Right — the form. */}
          <form onSubmit={onSubmit} className="flex flex-col gap-6 p-6 md:p-8">
            {/* flex-1 + justify-center keeps the logo/heading/fields optically centred against
                the panel's 500px min-height instead of stacking at the top and leaving a void
                above the footer. */}
            <div className="flex flex-1 flex-col justify-center gap-6">
              <div className="flex flex-col items-center gap-4 text-center">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-10 object-contain" />
                ) : (
                  <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
                    <Landmark className="size-5" />
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
                  <p className="text-muted-foreground text-balance">
                    Access the {brandName} admin panel
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="admin-password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <RecaptchaField ref={recaptchaRef} config={recaptcha} action="login" />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <LogIn className="size-4" />
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            </div>

            <p className="text-muted-foreground text-center text-sm">
              Not an administrator?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Go to the main login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground px-6 text-center text-sm text-balance">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

// Stands in for the admin illustration the design calls for. Drawn rather than shipped as an
// asset because the repo has none, and a missing src would render as a broken image on the
// panel that is most of this screen. Purely decorative → aria-hidden.
function PanelArtwork({ brandName }: { brandName: string }) {
  return (
    <div
      aria-hidden
      className="h-full w-full bg-[linear-gradient(150deg,#2748a0_0%,#1a2f66_50%,#0f1a38_100%)]"
    >
      {/* Soft light blooms, echoing the balance hero's treatment on the user side. */}
      <span className="absolute -top-16 -left-10 size-56 rounded-full bg-white/10 blur-2xl" />
      <span className="absolute right-[-3rem] bottom-[-2rem] size-64 rounded-full bg-white/5 blur-2xl" />
      <span className="absolute top-8 left-8 flex items-center gap-2 text-white/80">
        <span className="flex size-9 items-center justify-center rounded-md bg-white/15">
          <Landmark className="size-5" />
        </span>
        <span className="text-lg font-semibold">{brandName}</span>
      </span>
      <span className="absolute inset-x-8 bottom-8 block text-sm text-white/70">
        Review, approve, and manage the platform.
      </span>
    </div>
  );
}
