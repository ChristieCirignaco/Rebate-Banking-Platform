"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";

// Shown across the top of the user area while an admin is impersonating this account. "Stop
// impersonating" restores the admin's own session (Better Auth's stopImpersonating) and returns
// to the user's admin detail page — the admin session is never killed by this. Only rendered
// when the current session carries `impersonatedBy`, so a real user never sees it.
export function ImpersonationBanner({
  userName,
  userId,
}: {
  userName: string;
  userId: string;
}) {
  const [stopping, setStopping] = useState(false);

  async function stop() {
    if (stopping) return;
    setStopping(true);
    const { error } = await authClient.admin.stopImpersonating();
    if (error) {
      toast.error(error.message || "Couldn't stop impersonating.");
      setStopping(false);
      return;
    }
    // Full navigation so the restored admin-session cookie takes effect immediately; back to the
    // detail page the impersonation was started from.
    window.location.href = `/admin/users/${userId}`;
  }

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span className="inline-flex items-center gap-2">
        <UserCog className="size-4 shrink-0" />
        Viewing the app as <strong>{userName}</strong> — admin impersonation.
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={stop}
        disabled={stopping}
        className="h-7 border-amber-950/30 bg-amber-100 text-amber-950 hover:bg-amber-50 hover:text-amber-950"
      >
        {stopping ? "Returning…" : "Stop impersonating"}
      </Button>
    </div>
  );
}
