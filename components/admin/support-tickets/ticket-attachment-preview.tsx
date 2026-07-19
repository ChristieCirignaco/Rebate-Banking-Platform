"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TicketAttachmentView } from "./types";

// Renders one message attachment: images show as a clickable inline thumbnail (→
// lightbox); everything else (PDF, etc.) gets a compact file chip with Open/Download.
// Mirrors components/admin/kyc/kyc-file-preview.tsx's image-vs-download split.
export function TicketAttachmentPreview({ attachment }: { attachment: TicketAttachmentView }) {
  const [lightbox, setLightbox] = useState(false);
  const downloadUrl = `${attachment.url}?download=1`;

  if (attachment.isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="focus-visible:ring-ring bg-background/50 block max-w-56 overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Open ${attachment.name} full size`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-h-40 w-full object-contain"
          />
        </button>

        <Dialog open={lightbox} onOpenChange={setLightbox}>
          <DialogContent className="sm:max-w-4xl">
            <DialogTitle className="sr-only">{attachment.name}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[80dvh] w-full rounded-md object-contain"
            />
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href={downloadUrl} download={attachment.name}>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="bg-background/50 flex items-center gap-2 rounded-lg border p-2 pr-3">
      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
        <FileText className="size-4" />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
      <Button asChild variant="ghost" size="icon" className="size-7">
        <a href={attachment.url} target="_blank" rel="noreferrer" title="Open in new tab">
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
      <Button asChild variant="ghost" size="icon" className="size-7">
        <a href={downloadUrl} download={attachment.name} title="Download">
          <Download className="size-3.5" />
        </a>
      </Button>
    </div>
  );
}
