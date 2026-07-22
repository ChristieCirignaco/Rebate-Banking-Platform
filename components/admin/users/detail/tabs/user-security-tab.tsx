"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut, Lock, Smartphone, Trash2 } from "lucide-react";

import {
  adminClearUserPin,
  adminDisableTwoFactor,
  adminRevokeSessions,
  adminSetUserPassword,
  adminSetUserPin,
  type ActionResult,
} from "@/app/admin/users/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DeleteUserDialog } from "../../delete-user-dialog";
import type { UserDetail } from "../types";

// -----------------------------------------------------------------------------
// The Security tab. Every action here bypasses the proof the user themself would have to
// give (no old password, no current PIN) — they exist for support resets, which makes each
// one an account-takeover primitive. The server enforces that; this UI's job is to make the
// consequence legible BEFORE the click, so each dangerous control states in plain words what
// it does to the live account (sign-outs, emails) rather than burying it.
// -----------------------------------------------------------------------------

// Status dot + label: the current state of one control, read at a glance.
function StateLine({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          on ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
        aria-hidden
      />
      <span className={on ? "font-medium" : "text-muted-foreground"}>{children}</span>
    </div>
  );
}

// Consequence note attached to a dangerous control — amber, matching the warning boxes used
// in the withdrawal-control dialog.
function DangerNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
      {children}
    </div>
  );
}

function SecurityCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserSecurityTab({
  user,
  canDelete,
}: {
  user: UserDetail;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Which control is mid-flight, so only its button spins while every button disables.
  const [busy, setBusy] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const [clearPinOpen, setClearPinOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  // Run an action, toast either way, and refresh so the card state re-reads from the server.
  // `onSuccess` closes the dialog — on failure it stays open with the input intact.
  function run(
    key: string,
    action: () => Promise<ActionResult>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    if (isPending) return;
    setBusy(key);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
      setBusy(null);
    });
  }

  // ----- password -----
  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordValid = password.length >= 8 && password === passwordConfirm;

  function handlePasswordOpen(next: boolean) {
    setPasswordOpen(next);
    if (!next) {
      setPassword("");
      setPasswordConfirm("");
    }
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordValid) return;
    run(
      "password",
      () => adminSetUserPassword(user.id, password),
      "Password updated — the user has been signed out and emailed",
      () => handlePasswordOpen(false),
    );
  }

  // ----- pin -----
  const pinTooShort = pin.length > 0 && pin.length < 4;
  const pinMismatch = pinConfirm.length > 0 && pin !== pinConfirm;
  const pinValid = pin.length >= 4 && pin.length <= 6 && pin === pinConfirm;

  function handlePinOpen(next: boolean) {
    setPinOpen(next);
    if (!next) {
      setPin("");
      setPinConfirm("");
    }
  }

  function submitPin(event: FormEvent) {
    event.preventDefault();
    if (!pinValid) return;
    run(
      "pin",
      () => adminSetUserPin(user.id, pin),
      user.hasPin ? "Transaction PIN replaced" : "Transaction PIN set",
      () => handlePinOpen(false),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- Password ---------------- */}
      <SecurityCard
        icon={Lock}
        title="Password"
        description="Set a new sign-in password without the current one."
      >
        <StateLine on={user.hasPassword}>
          {user.hasPassword ? "Password sign-in enabled" : "No password sign-in on this account"}
        </StateLine>

        {user.hasPassword ? (
          <div>
            <Button variant="outline" onClick={() => setPasswordOpen(true)} disabled={isPending}>
              Set new password
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">
              This user signs in with a social provider only, so there is no password to reset.
            </p>
            <div>
              <Button variant="outline" disabled title="This account has no password sign-in">
                Set new password
              </Button>
            </div>
          </>
        )}
      </SecurityCard>

      <Dialog open={passwordOpen} onOpenChange={handlePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set a new password</DialogTitle>
            <DialogDescription>
              You are setting a password for {user.name} without their current one.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-password">New password</Label>
              <Input
                id="sec-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
              {passwordTooShort ? (
                <p className="text-destructive text-xs">
                  Password must be at least 8 characters.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-password-confirm">Confirm new password</Label>
              <Input
                id="sec-password-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Re-enter the password"
              />
              {passwordMismatch ? (
                <p className="text-destructive text-xs">Passwords do not match.</p>
              ) : null}
            </div>

            <DangerNote>
              This signs {user.name} out of every device immediately and emails them that an
              administrator changed their password. Tell them the new password through a channel
              you trust — the email does not contain it.
            </DangerNote>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePasswordOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending || !passwordValid}>
                {isPending && busy === "password" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Set password &amp; sign out
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Transaction PIN ---------------- */}
      <SecurityCard
        icon={KeyRound}
        title="Transaction PIN"
        description="The 4–6 digit PIN that authorizes every money action."
      >
        <StateLine on={user.hasPin}>{user.hasPin ? "PIN is set" : "No PIN set"}</StateLine>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPinOpen(true)} disabled={isPending}>
            {user.hasPin ? "Replace PIN" : "Set PIN"}
          </Button>
          {user.hasPin ? (
            <Button
              variant="destructive"
              onClick={() => setClearPinOpen(true)}
              disabled={isPending}
            >
              Remove PIN
            </Button>
          ) : null}
        </div>

        {!user.hasPin ? (
          <p className="text-muted-foreground text-xs">
            With no PIN set, this user is asked to create one the next time they move money.
          </p>
        ) : null}
      </SecurityCard>

      <Dialog open={pinOpen} onOpenChange={handlePinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{user.hasPin ? "Replace transaction PIN" : "Set transaction PIN"}</DialogTitle>
            <DialogDescription>
              {user.hasPin
                ? `This overwrites the PIN ${user.name} currently uses — their old one stops working straight away.`
                : `This gives ${user.name} a PIN they did not choose.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-pin">New PIN</Label>
              <Input
                id="sec-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="h-12 text-center text-lg tracking-[0.5em]"
                autoFocus
              />
              {pinTooShort ? (
                <p className="text-destructive text-xs">PIN must be 4–6 digits.</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-pin-confirm">Confirm new PIN</Label>
              <Input
                id="sec-pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="h-12 text-center text-lg tracking-[0.5em]"
              />
              {pinMismatch ? <p className="text-destructive text-xs">PINs do not match.</p> : null}
            </div>

            <DangerNote>
              Anyone holding this PIN can authorize transfers from this account. {user.name} is
              emailed that an administrator changed it — pass the new PIN to them through a channel
              you trust.
            </DangerNote>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePinOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !pinValid}>
                {isPending && busy === "pin" ? <Loader2 className="size-4 animate-spin" /> : null}
                {user.hasPin ? "Replace PIN" : "Set PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearPinOpen}
        onOpenChange={setClearPinOpen}
        title="Remove this transaction PIN?"
        description={`${user.name} will be asked to create a new PIN the next time they move money. They are not notified that it was removed. This does not disable the PIN gate — it only clears the PIN they forgot.`}
        confirmLabel="Remove PIN"
        pending={isPending && busy === "clear-pin"}
        onConfirm={() =>
          run("clear-pin", () => adminClearUserPin(user.id), "Transaction PIN removed", () =>
            setClearPinOpen(false),
          )
        }
      />

      {/* ---------------- Two-factor ---------------- */}
      <SecurityCard
        icon={Smartphone}
        title="Two-factor authentication"
        description="A time-based code from the user's own authenticator app."
      >
        <StateLine on={user.twoFactorEnabled}>
          {user.twoFactorEnabled ? "Enabled" : "Disabled"}
        </StateLine>

        {user.twoFactorEnabled ? (
          <div>
            <Button
              variant="destructive"
              onClick={() => setTwoFactorOpen(true)}
              disabled={isPending}
            >
              Disable two-factor
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            An admin cannot turn two-factor on for a user — the secret has to be enrolled on their
            own authenticator app. {user.name} must set it up themselves from Settings → Security.
          </p>
        )}
      </SecurityCard>

      <ConfirmDialog
        open={twoFactorOpen}
        onOpenChange={setTwoFactorOpen}
        title="Disable two-factor authentication?"
        description={`This removes a layer of protection from ${user.name}'s account: sign-in will need only their password. They are emailed that an administrator disabled it. You cannot turn it back on for them — they must re-enrol it themselves from Settings → Security.`}
        confirmLabel="Disable two-factor"
        pending={isPending && busy === "2fa"}
        onConfirm={() =>
          run("2fa", () => adminDisableTwoFactor(user.id), "Two-factor disabled", () =>
            setTwoFactorOpen(false),
          )
        }
      />

      {/* ---------------- Sessions ---------------- */}
      <SecurityCard
        icon={LogOut}
        title="Sessions"
        description="Devices currently signed in to this account."
      >
        <StateLine on={user.activeSessions > 0}>
          {user.activeSessions === 1
            ? "1 active session"
            : `${user.activeSessions} active sessions`}
        </StateLine>

        <div>
          <Button
            variant="destructive"
            onClick={() => setSessionsOpen(true)}
            disabled={isPending || user.activeSessions === 0}
            title={user.activeSessions === 0 ? "This user has no active sessions" : undefined}
          >
            {isPending && busy === "sessions" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Sign out everywhere
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Ends every signed-in device immediately. The user keeps their password, PIN and
          two-factor, and can sign back in right away.
        </p>
      </SecurityCard>

      <ConfirmDialog
        open={sessionsOpen}
        onOpenChange={setSessionsOpen}
        title="Sign out every device?"
        description={`This immediately ends ${
          user.activeSessions === 1 ? "the active session" : `all ${user.activeSessions} active sessions`
        } for ${user.name}. They keep their password, PIN and two-factor, and can sign back in right away.`}
        confirmLabel="Sign out everywhere"
        pending={isPending && busy === "sessions"}
        onConfirm={() =>
          run("sessions", () => adminRevokeSessions(user.id), "User signed out everywhere", () =>
            setSessionsOpen(false),
          )
        }
      />

      {/* ---------------- Delete account (super_admin only) ---------------- */}
      {/* The one irreversible control on the page — sits last, in its own red-framed card so it
          reads as separate from the reversible resets above. Shown only to a super_admin; the
          deleteUser action enforces the same gate regardless of what renders here. */}
      {canDelete ? (
        <>
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="size-4" />
                Delete account
              </CardTitle>
              <CardDescription>
                Permanently delete {user.name} and all of their data. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DangerNote>
                This erases the account, every wallet, and the entire transaction history for{" "}
                {user.name} — there is no recovery. You&apos;ll be asked for your admin password to
                confirm.
              </DangerNote>
              <div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={isPending}
                >
                  <Trash2 className="size-4" />
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>

          <DeleteUserDialog
            user={{
              id: user.id,
              name: user.name,
              username: user.username,
              email: user.email,
              joinedAt: user.joinedAt,
            }}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            // The record we're viewing is gone after this — a full navigation avoids the wedge
            // that awaiting a Server Action then router.push causes, and lands on the list.
            onDeleted={() => {
              window.location.href = "/admin/users";
            }}
          />
        </>
      ) : null}
    </div>
  );
}
