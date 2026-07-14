"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText, ImageOff, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { KycFieldValueView } from "./types";

// Renders one File field. Images show inline (contained, rounded, clickable → lightbox)
// with Open/Download; PDFs and other formats are NOT rendered inline — they get a file
// card with Open-in-new-tab + Download. `?download=1` forces an attachment on the server.
export function KycFilePreview({ field }: { field: KycFieldValueView }) {
  const [lightbox, setLightbox] = useState(false);
  const label = field.label || "Document";

  if (!field.url) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
        <ImageOff className="size-4" />
        No file uploaded.
      </div>
    );
  }

  const downloadUrl = `${field.url}?download=1`;

  if (field.isImage) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="focus-visible:ring-ring bg-muted block max-w-md overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Open ${label} full size`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={field.url} alt={label} className="max-h-72 w-full object-contain" />
        </button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={field.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={downloadUrl} download={field.name ?? ""}>
              <Download className="size-4" />
              Download
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLightbox(true)}
          >
            <Maximize2 className="size-4" />
            Fullscreen
          </Button>
        </div>

        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="sm:max-w-4xl">
            <DialogTitle className="sr-only">{label}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={field.url}
              alt={label}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Non-image (PDF or other) — offer open + download, no inline render.
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <FileText className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium break-all">{field.name ?? label}</span>
          <span className="text-muted-foreground text-xs uppercase">
            {field.contentType?.split("/")[1] ?? "file"}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={field.url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open in new tab
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={downloadUrl} download>
            <Download className="size-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
