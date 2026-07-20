// Renderer for the "documents" CMS component — files an admin attaches to a marketing page.
//
// The presentation is derived from the file's own extension rather than a field the admin has to
// set, so it can never disagree with the file that was actually uploaded:
//
//   image → rendered inline, click to open full size
//   pdf   → embedded viewer with a download fallback
//   file  → download card
//
// Office formats (docx/xlsx/pptx) deliberately do NOT preview. Rendering them in-browser needs a
// third-party viewer (Google Docs / Office Online), which means shipping the file to an outside
// service — not something to do silently to a document an admin published here. A download card
// is the honest affordance.
import Image from "next/image";
import { Download, ExternalLink, FileSpreadsheet, FileText, FileType, Paperclip } from "lucide-react";

import { Reveal } from "@/components/home/reveal";
import { cmsText, type CmsItem } from "@/lib/cms/types";
import {
  cmsDocumentDownloadUrl,
  cmsDocumentExt,
  cmsDocumentKind,
  cmsDocumentLabel,
} from "@/lib/cms/documents";
import type { SectionProps } from "./section-props";

const FILE_ICONS: Record<string, typeof FileText> = {
  doc: FileType,
  docx: FileType,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: FileText,
  pptx: FileText,
  txt: FileText,
  zip: Paperclip,
};

function DocumentCard({ item }: { item: CmsItem }) {
  const file = cmsText(item.data, "file");
  const title = cmsText(item.data, "title");
  const description = cmsText(item.data, "description");
  if (!file) return null;

  const kind = cmsDocumentKind(file);
  const badge = cmsDocumentLabel(file);
  const Icon = FILE_ICONS[cmsDocumentExt(file)] ?? Paperclip;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      {kind === "image" ? (
        <a href={file} target="_blank" rel="noreferrer" className="block bg-slate-50">
          {/* Admin-uploaded dimensions are unknown, so this is a fixed-height contain box —
              letting the image set its own height would reflow the grid as each one loads. */}
          <span className="relative block h-56 w-full">
            <Image
              src={file}
              alt={title || "Document preview"}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-3"
            />
          </span>
        </a>
      ) : kind === "pdf" ? (
        // <object> degrades on its own: a browser that won't render the PDF shows the children
        // instead, so there is always a way to reach the file.
        <object data={file} type="application/pdf" className="h-56 w-full bg-slate-50">
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
            <FileText className="h-8 w-8 text-slate-400" />
            <a
              href={file}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[var(--trb-blue)] hover:underline"
            >
              Open the PDF
            </a>
          </div>
        </object>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center gap-3 bg-slate-50">
          <Icon className="h-10 w-10 text-slate-400" />
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold tracking-wide text-slate-500 shadow-sm">
            {badge}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-[var(--trb-dark)]">{title}</h3>
          <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-500">
            {badge}
          </span>
        </div>
        {description ? (
          <p className="text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <a
            href={cmsDocumentDownloadUrl(file)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--trb-blue)] hover:underline"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          {kind !== "file" ? (
            <a
              href={file}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Body only — for pages that already provide their own section shell. */
export function DocumentsBlock({ data }: SectionProps) {
  const heading = cmsText(data.content, "heading");
  const intro = cmsText(data.content, "intro");
  const items = data.collections.items ?? [];
  if (items.length === 0) return null;

  return (
    <>
      {heading ? (
        <h2 className="text-2xl font-bold tracking-tight text-[var(--trb-dark)] sm:text-3xl">
          {heading}
        </h2>
      ) : null}
      {intro ? <p className="mt-3 text-slate-600">{intro}</p> : null}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <Reveal key={item.id} delay={index * 100} className="h-full">
            <DocumentCard item={item} />
          </Reveal>
        ))}
      </div>
    </>
  );
}

/** Full section with its own background — how the component renders when added to a page. */
export function DocumentsSection(props: SectionProps) {
  const items = props.data.collections.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="bg-white text-[var(--trb-dark)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        <DocumentsBlock {...props} />
      </div>
    </section>
  );
}
