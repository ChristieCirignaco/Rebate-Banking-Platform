import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession, getSession } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  // Already signed in? Send admins to the panel; a signed-in regular user to their area.
  if (await getAdminSession()) redirect("/admin");
  if (await getSession()) redirect("/dashboard");

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        {/* AdminLoginForm reads ?redirect=, so it needs a Suspense boundary. */}
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
