import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { decodeNewsId, fetchArticleMeta } from "@/lib/home/news";

type Params = { params: Promise<{ id: string }> };

function longDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const url = decodeNewsId(id);
  if (!url) return { title: "Latest Updates" };
  const meta = await fetchArticleMeta(url);
  return {
    title: meta?.title || "Latest Updates",
    description: meta?.description || undefined,
    // Aggregated preview of a third-party article — keep it out of search indexes.
    robots: { index: false, follow: true },
  };
}

export default async function NewsArticlePage({ params }: Params) {
  const { id } = await params;
  const url = decodeNewsId(id);
  if (!url) notFound();

  const meta = await fetchArticleMeta(url);
  if (!meta || !meta.title) notFound();

  const source = meta.siteName || new URL(url).hostname.replace(/^www\./, "");
  const dateLabel = longDate(meta.publishedAt);

  return (
    <main>
      {/* ===== title ===== */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 pt-36 pb-12 sm:px-8">
          {dateLabel && (
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
              {dateLabel}
            </p>
          )}
          <h1 className="hero-headline mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            {meta.title}
          </h1>
        </div>
      </section>

      {/* ===== image + summary ===== */}
      <section className="bg-white text-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
          {meta.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.image}
              alt=""
              className="aspect-[16/9] w-full rounded-2xl bg-slate-100 object-cover shadow-md"
            />
          )}

          {meta.description && (
            <p className="mt-8 text-lg leading-relaxed text-slate-700">{meta.description}</p>
          )}

          {/* Required attribution: the headline, image, and summary are the publisher's
              copyrighted content, so we credit and link back to the original source. */}
          <p className="mt-10 border-t border-black/5 pt-6 text-xs text-slate-400">
            Source:{" "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-[var(--trb-blue)]"
            >
              {source}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
