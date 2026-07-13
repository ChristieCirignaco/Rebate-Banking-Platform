import Link from "next/link";

// Marketing home. The user-facing and marketing surfaces use bespoke modern
// Tailwind (not shadcn, which is reserved for the admin) — see design spec §13.
// This is a Phase 0 placeholder; the full marketing site lands in Phase 7.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <span className="text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
          Rebate Banking
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turn everyday purchases into wallet cash.
        </h1>
        <p className="text-muted-foreground mt-4 text-lg text-pretty">
          Submit what you bought, we review it, and your rebate lands in your
          wallet — ready to withdraw. No affiliate links, no tasks, no catch.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-md bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Get started
          </Link>
          <Link
            href="/admin"
            className="hover:bg-accent inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
