import type { ReactNode } from "react";

import { requireActiveUser } from "@/lib/auth-guards";
import { AppFrame } from "@/components/app/app-frame";
import { BottomTabBar } from "@/components/app/bottom-tab-bar";

// Shell for the whole authenticated user area. The full gate runs once here — valid
// session, non-admin, active status, email-OTP cleared — so every screen under (app) is
// protected in one place (pages still fetch their own data). A pending/suspended account
// is redirected to /login with an inline notice before any dashboard renders.
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireActiveUser();

  return (
    <AppFrame>
      {children}
      <BottomTabBar />
    </AppFrame>
  );
}
