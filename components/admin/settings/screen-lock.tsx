"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";

import { unlockScreen } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The design's blue. The admin theme's own --primary is a neutral near-black, so the unlock
// button opts out of the token deliberately rather than by accident — if the theme ever adopts
// this blue, drop these two classes and let `primary` win.
const UNLOCK_BLUE = "bg-[#3b51cc] text-white hover:bg-[#3345ad]";

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
  brandName,
  logoUrl,
  artworkUrl,
}: {
  enabled: boolean;
  idleMs: number;
  adminName: string;
  adminEmail: string;
  /** General → brand name, for the wordmark shown when no logo is configured. */
  brandName: string;
  /** Branding → logo, shown above the form. Falls back to a wordmark when unset. */
  logoUrl?: string | null;
  /** Optional illustration for the left panel. The repo ships no credit-card artwork, so
   *  without one the panel renders a self-contained gradient + card motif instead of a
   *  broken <img>. Drop a file in /public and pass its path to use a real image. */
  artworkUrl?: string | null;
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
      brandName={brandName}
      logoUrl={logoUrl}
      artworkUrl={artworkUrl}
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
  brandName,
  logoUrl,
  artworkUrl,
  onUnlocked,
}: {
  adminName: string;
  adminEmail: string;
  brandName: string;
  logoUrl?: string | null;
  artworkUrl?: string | null;
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
    // Covers the admin shell rather than being its own route — the lock is an idle overlay, so
    // it must sit over whatever page the admin was on. overflow-hidden gives the "no page
    // scroll" the design calls for without touching the body element.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account locked"
      className="bg-muted fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4"
    >
      {/* gap-0/p-0 undo Card's own flex spacing tokens so the artwork can bleed to the edges;
          the min-height stops the card collapsing to the form's intrinsic height on md+. */}
      <Card className="grid w-full max-w-3xl gap-0 overflow-hidden p-0 shadow-xl md:min-h-[380px] md:grid-cols-2">
        {/* Left — decorative panel. Below md it stacks above the form, so it keeps a fixed
            height there and only stretches to the card on md+. */}
        <div className="relative h-40 md:h-auto">
          {artworkUrl ? (
            // absolute, not just h-full: on md the panel's height is auto (set by the form
            // column), so an in-flow img would contribute its intrinsic height and a portrait
            // asset would stretch the card. Out of flow it crops to the card instead.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artworkUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <ArtworkFallback />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50" />
          {/* Same translucent band as the admin login panel — both are admin auth screens over
              the same artwork, so they share the treatment. */}
          <h2 className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 bg-black/75 p-2 text-center text-3xl font-bold text-white">
            Account Locked
          </h2>
        </div>

        {/* Right — the unlock form. */}
        <div className="flex flex-col justify-center gap-6 py-8">
          <CardHeader className="justify-items-center gap-2 text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-9 object-contain" />
            ) : (
              <span className="text-muted-foreground flex items-center gap-2 text-sm font-semibold tracking-wide">
                <ShieldCheck className="size-4" />
                {brandName}
              </span>
            )}
            {/* Whose password is expected — a shared machine may have more than one admin, and
                "enter your password" alone doesn't say which account it will check. */}
            <p className="text-muted-foreground w-full truncate text-xs" title={adminEmail}>
              {adminName} · {adminEmail}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Label htmlFor="unlock-password">Enter your password to unlock</Label>

              {/* Leading icon inside a relative wrapper; pl-10 keeps the text clear of it. */}
              <div className="relative">
                <Lock
                  aria-hidden
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="unlock-password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="pl-10"
                />
              </div>

              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting || !password}
                className={`w-full ${UNLOCK_BLUE}`}
              >
                <LockOpen className="size-4" />
                {submitting ? "Unlocking…" : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

// Stands in for the credit-card illustration the design calls for. Drawn rather than shipped as
// an asset because the repo has no such artwork, and a missing src would render as a broken
// image in the one screen an admin cannot navigate away from. Purely decorative → aria-hidden.
function ArtworkFallback() {
  return (
    <div
      aria-hidden
      className="h-full w-full bg-[linear-gradient(145deg,#3b51cc_0%,#2a3a99_55%,#1b2569_100%)]"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-28 w-44 rotate-[-8deg] rounded-xl bg-white/15 p-3 shadow-lg ring-1 ring-white/25 backdrop-blur-sm">
          <div className="h-5 w-7 rounded bg-amber-300/80" />
          <div className="mt-4 h-1.5 w-24 rounded-full bg-white/50" />
          <div className="mt-1.5 h-1.5 w-16 rounded-full bg-white/35" />
          <div className="absolute right-3 bottom-3 flex">
            <span className="size-5 rounded-full bg-white/50" />
            <span className="-ml-2 size-5 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
