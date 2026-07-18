"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Check, Copy, ShieldCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/account/settings-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { initialEnabled: boolean };

// Views of the local enrollment/management state machine.
type View =
  | "status" // resting: shows enabled/disabled state
  | "enable-password" // collect password to begin enrollment
  | "qr" // scan QR + save backup codes + confirm TOTP
  | "disable-password" // collect password to turn 2FA off
  | "regen-password"; // collect password to regenerate backup codes

// A monospace grid of one-time backup codes with a copy-all button. Shown after enrollment
// and after regeneration — the warning copy is the caller's responsibility to place above.
function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API is unavailable on insecure origins / when permission is denied.
      toast.error("Couldn't copy — select and copy the codes manually.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/50">
        {codes.map((code) => (
          <code key={code} className="font-mono text-sm tabular-nums">
            {code}
          </code>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-fit" onClick={copyAll}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy codes"}
      </Button>
    </div>
  );
}

export function TwoFactorSetup({ initialEnabled }: Props) {
  const router = useRouter();

  const [view, setView] = useState<View>("status");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Enrollment payload, live only during the "qr" step.
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Backup codes shown after a standalone regeneration (separate from enrollment).
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null);

  // Reset back to the resting status view, clearing any transient inputs/secrets.
  function resetToStatus() {
    setView("status");
    setPassword("");
    setCode("");
    setQrDataUrl("");
    setTotpUri("");
    setBackupCodes([]);
  }

  // Step 1 of enrollment: verify the password and fetch the TOTP URI + backup codes.
  async function beginEnrollment() {
    setLoading(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? "Wrong password");
      return;
    }
    // Compute the QR image in the handler (not in an effect) — this repo's ESLint forbids
    // react-hooks/set-state-in-effect.
    const dataUrl = await QRCode.toDataURL(data.totpURI);
    setQrDataUrl(dataUrl);
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes);
    setPassword("");
    setView("qr");
  }

  // Step 2 of enrollment: confirm a code from the authenticator app to flip 2FA on.
  async function confirmTotp() {
    setLoading(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (error) {
      toast.error("That code didn't match");
      return;
    }
    toast.success("Two-factor authentication is on");
    resetToStatus();
    router.refresh();
  }

  async function disable2fa() {
    setLoading(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Wrong password");
      return;
    }
    toast.success("Two-factor authentication is off");
    resetToStatus();
    router.refresh();
  }

  async function regenerateCodes() {
    setLoading(true);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({
      password,
    });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? "Wrong password");
      return;
    }
    toast.success("New backup codes generated");
    setRegenCodes(data.backupCodes);
    setPassword("");
    setView("status");
  }

  return (
    <SettingsCard
      icon={ShieldCheck}
      title="Two-factor authentication"
      description="Add a second step at sign-in using an authenticator app like Google Authenticator, 1Password, or Authy."
    >
      <div className="flex flex-col gap-5">
        {/* ── Resting status view ─────────────────────────────────────────── */}
        {view === "status" && (
          <div className="flex flex-col gap-5">
            {initialEnabled ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge className="border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="size-3" />
                    Enabled
                  </Badge>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Your account is protected with an authenticator app.
                  </span>
                </div>

                {regenCodes && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Save these now — they won&apos;t be shown again.
                    </p>
                    <BackupCodes codes={regenCodes} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRegenCodes(null);
                      setView("disable-password");
                    }}
                  >
                    Disable 2FA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegenCodes(null);
                      setView("regen-password");
                    }}
                  >
                    Regenerate backup codes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Not enabled</Badge>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Two-factor authentication is currently off.
                  </span>
                </div>
                <Button
                  className="w-fit"
                  onClick={() => setView("enable-password")}
                >
                  Enable two-factor authentication
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Password prompt to begin enrollment ─────────────────────────── */}
        {view === "enable-password" && (
          <PasswordPrompt
            label="Confirm your password to continue"
            password={password}
            onPasswordChange={setPassword}
            loading={loading}
            confirmLabel="Continue"
            onConfirm={beginEnrollment}
            onCancel={resetToStatus}
          />
        )}

        {/* ── QR + backup codes + confirm ─────────────────────────────────── */}
        {view === "qr" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                1. Scan this QR code with your authenticator app
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Authenticator QR code"
                    className="size-44 rounded-lg border bg-white p-2"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <code className="rounded border bg-slate-50 px-2 py-1 text-xs break-all text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    {totpUri}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">2. Save your backup codes</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Save these now — they won&apos;t be shown again.
              </p>
              <BackupCodes codes={backupCodes} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="totp-code" className="text-sm font-semibold">
                3. Enter the code from your app to finish
              </Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="max-w-40 tracking-widest tabular-nums"
              />
              <div className="mt-1 flex gap-2">
                <Button
                  onClick={confirmTotp}
                  disabled={loading || code.length < 6}
                >
                  {loading ? "Verifying…" : "Finish setup"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetToStatus}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Password prompt to disable ──────────────────────────────────── */}
        {view === "disable-password" && (
          <PasswordPrompt
            label="Confirm your password to disable 2FA"
            password={password}
            onPasswordChange={setPassword}
            loading={loading}
            confirmLabel="Disable 2FA"
            confirmVariant="destructive"
            onConfirm={disable2fa}
            onCancel={resetToStatus}
          />
        )}

        {/* ── Password prompt to regenerate backup codes ──────────────────── */}
        {view === "regen-password" && (
          <PasswordPrompt
            label="Confirm your password to regenerate backup codes"
            password={password}
            onPasswordChange={setPassword}
            loading={loading}
            confirmLabel="Regenerate codes"
            onConfirm={regenerateCodes}
            onCancel={resetToStatus}
          />
        )}
      </div>
    </SettingsCard>
  );
}

// A small inline password prompt reused by the enable / disable / regenerate flows.
function PasswordPrompt({
  label,
  password,
  onPasswordChange,
  loading,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: {
  label: string;
  password: string;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="2fa-password" className="text-sm font-semibold">
          {label}
        </Label>
        <Input
          id="2fa-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant={confirmVariant}
          disabled={loading || !password}
        >
          {loading ? "Please wait…" : confirmLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
