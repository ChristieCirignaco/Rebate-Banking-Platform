import type { ReactNode } from "react";

import { PageShellSkeleton } from "@/components/app/skeletons/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/(app)/account/security/page.tsx: three stacked SettingsCards — password and
// transaction PIN are narrow three-field forms, two-factor rests on a badge + button row rather
// than a form, so a single form skeleton here would be both the wrong shape and the wrong height.

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="size-9 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
      </div>
      {children}
    </section>
  );
}

function CredentialForm({ fields, note }: { fields: number; note?: boolean }) {
  return (
    <div className="flex max-w-xs flex-col gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ))}
      {note ? <Skeleton className="h-3 w-60 max-w-full" /> : null}
      <Skeleton className="h-8 w-36 rounded-lg" />
    </div>
  );
}

export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="flex flex-col gap-4">
        <CardShell>
          {/* Password: current + new + confirm, plus the sign-out-everywhere note. */}
          <CredentialForm fields={3} note />
        </CardShell>

        <CardShell>
          {/* Two-factor at rest: enabled/disabled badge, then the action buttons. */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-56 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <Skeleton className="h-8 w-48 rounded-lg" />
            </div>
          </div>
        </CardShell>

        <CardShell>
          {/* Transaction PIN: current + new + confirm when a PIN is already set. */}
          <CredentialForm fields={3} />
        </CardShell>
      </div>
    </PageShellSkeleton>
  );
}
