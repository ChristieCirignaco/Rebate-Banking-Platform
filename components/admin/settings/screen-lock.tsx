"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { unlockScreen } from "@/app/admin/settings/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

const LOCK_KEY = "admin-screen-locked";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

// Idle screen lock for the admin panel. Mounted in the admin layout with the configured
// idle window; after that much inactivity it drops a full-screen overlay that requires the
// admin's password to dismiss. The lock persists across refresh via sessionStorage.
export function ScreenLock({
  enabled,
  idleMs,
  adminName,
  adminEmail,
}: {
  enabled: boolean;
  idleMs: number;
  adminName: string;
  adminEmail: string;
}) {
  const [locked, setLocked] = useState(false);
  // Skip the persist effect's first run so it can't clear the stored flag on mount before
  // the restore rAF below reads it (that race would let a refresh silently unlock).
  const persistReady = useRef(false);

  // Restore a persisted lock across refresh — deferred via rAF so it isn't a synchronous
  // setState-in-effect (which this repo's lint forbids).
  useEffect(() => {
    if (!enabled) return;
    const raf = requestAnimationFrame(() => {
      if (sessionStorage.getItem(LOCK_KEY) === "1") setLocked(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  // Idle tracking runs only while unlocked; flipping `locked` re-runs this effect, which
  // early-returns (tearing down the listeners) once locked. The timer fires setLocked in a
  // callback (deferred), never synchronously in the effect body.
  useEffect(() => {
    if (!enabled || locked) return;
    let timer: number;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLocked(true), idleMs);
    };
    arm();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, arm, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, arm);
    };
  }, [enabled, idleMs, locked]);

  // Persist the lock so a refresh keeps it locked (side effect only — no setState). The
  // first run (mount) is skipped so it doesn't wipe a flag the restore rAF is about to read.
  useEffect(() => {
    if (!enabled) return;
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    if (locked) sessionStorage.setItem(LOCK_KEY, "1");
    else sessionStorage.removeItem(LOCK_KEY);
  }, [enabled, locked]);

  if (!enabled || !locked) return null;

  return (
    <LockOverlay
      adminName={adminName}
      adminEmail={adminEmail}
      onUnlocked={() => {
        // Clear the persisted flag synchronously — before the overlay's router.refresh()
        // can remount this component and have its restore read a stale "locked" flag.
        sessionStorage.removeItem(LOCK_KEY);
        setLocked(false);
      }}
    />
  );
}

function LockOverlay({
  adminName,
  adminEmail,
  onUnlocked,
}: {
  adminName: string;
  adminEmail: string;
  onUnlocked: () => void;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await unlockScreen(password);
      if (result.ok) {
        setPassword("");
        onUnlocked();
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked"
      className="bg-background/95 fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border p-6 shadow-lg">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Lock className="size-5" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-semibold">Screen locked</h2>
          <p className="text-muted-foreground text-sm">
            Your session was locked for inactivity. Enter your password to continue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials(adminName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{adminName}</span>
            <span className="text-muted-foreground text-xs">{adminEmail}</span>
          </div>
        </div>
        <form onSubmit={submit} className="flex w-full flex-col gap-3">
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            aria-label="Password"
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button type="submit" disabled={submitting || !password}>
            {submitting ? "Unlocking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
