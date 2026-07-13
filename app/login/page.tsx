import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        {/* LoginForm reads the ?redirect= param, so it needs a Suspense boundary. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
