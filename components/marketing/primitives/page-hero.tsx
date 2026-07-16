import Link from "next/link";

// Inner-page banner used by About / Service / Product (and any dark-hero page).
export function PageHero({
  title,
  breadcrumb,
  variant = "dark",
}: {
  title: string;
  breadcrumb?: string;
  variant?: "dark" | "light";
}) {
  const dark = variant === "dark";
  return (
    <section className={dark ? "bg-[var(--trb-dark)]" : "bg-slate-50"}>
      <div className="mx-auto max-w-7xl px-6 pt-36 pb-16 text-center sm:px-8">
        <h1
          className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
            dark ? "hero-headline text-white" : "text-[var(--trb-dark)]"
          }`}
        >
          {title}
        </h1>
        {breadcrumb && (
          <p className={`mt-4 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>
            <Link href="/" className="text-[var(--trb-blue)] hover:underline">
              Home
            </Link>{" "}
            <span className="mx-1">&gt;</span> {breadcrumb}
          </p>
        )}
      </div>
    </section>
  );
}
