import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

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

  const host = new URL(url).hostname.replace(/^www\./, "");
  const source = meta.siteName || host;
  const dateLabel = longDate(meta.publishedAt);

  return (
    <main>
      {/* ===== hero ===== */}
      <section className="bg-[var(--trb-dark)]">
        <div className="mx-auto max-w-3xl px-6 pt-36 pb-12 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Latest Updates
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--trb-gold)]">
            <span>{source}</span>
            {dateLabel && <span className="text-white/50">· {dateLabel}</span>}
          </div>
          <h1 className="hero-headline mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            {meta.title}
          </h1>
        </div>
      </section>

      {/* ===== preview ===== */}
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

          <div className="mt-10 rounded-2xl border border-black/5 bg-slate-50 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-slate-600">
              This is a preview of a story published by <span className="font-semibold">{source}</span>.
              Read the full article at the source.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--trb-blue)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)]"
            >
              Read the full story at {source} <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 border-t border-black/5 pt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--trb-blue)] transition-colors hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
