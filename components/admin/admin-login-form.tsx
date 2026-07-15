"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// Admin sign-in. Hard-gated to admin-tier accounts: a non-admin who authenticates here is
// immediately signed back out so a regular user can never establish an admin session
// through this form (they use /login instead). Its distinct two-panel look is intentional
// — it keeps the admin entry visually separate from the user login.
export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const { error } = await authClient.signIn.email({ email, password, rememberMe: true });
    if (error) {
      setIsLoading(false);
      toast.error(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Invalid email or password.",
      );
      return;
    }

    // Confirm the account is admin-tier; if not, undo the sign-in so no admin session sticks.
    const session = await authClient.getSession();
    const role = session.data?.user?.role ?? "";
    if (!ADMIN_ROLES.has(role)) {
      await authClient.signOut();
      setIsLoading(false);
      toast.error("This sign-in is for administrators. Please use the main login.");
      return;
    }

    toast.success("Signed in");
    router.push(redirectTo.startsWith("/admin") ? redirectTo : "/admin");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Admin sign in</h1>
                <p className="text-muted-foreground text-balance">
                  Access the Rebate Bank admin panel
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="admin-email">Email</FieldLabel>
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
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="admin-password">Password</FieldLabel>
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
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Not an administrator? <Link href="/login">Go to the main login</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-primary relative hidden md:block">
            <div className="text-primary-foreground absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex items-center gap-2">
                <div className="bg-primary-foreground/15 flex size-9 items-center justify-center rounded-md">
                  <Landmark className="size-5" />
                </div>
                <span className="text-lg font-semibold">Rebate Bank</span>
              </div>
              <div>
                <p className="text-2xl font-semibold text-balance">Administration</p>
                <p className="text-primary-foreground/70 mt-2 text-sm">
                  Review, approve, and manage the platform.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  );
}
