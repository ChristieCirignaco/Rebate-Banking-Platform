"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { uploadCmsDocument } from "@/lib/media";
import {
  CMS_DOCUMENT_ACCEPT,
  MAX_CMS_DOCUMENT_BYTES,
  MAX_CMS_DOCUMENT_LABEL,
  cmsDocumentKind,
  cmsDocumentLabel,
} from "@/lib/cms/documents";

// Upload control for the CMS "file" field. Stores the served URL the upload route returns, the
// same contract ImageField uses — the page renderer derives how to present the document from
// that URL's extension, so nothing else has to be persisted alongside it.
export function CmsDocumentField({
  label,
  value,
  onChange,
  help,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    // Mirrors the route's cap so an oversized file fails here instead of after the upload.
    if (file.size > MAX_CMS_DOCUMENT_BYTES) {
      toast.error(`Document must be under ${MAX_CMS_DOCUMENT_LABEL}.`);
      return;
    }
    setUploading(true);
    const result = await uploadCmsDocument(file);
    setUploading(false);
    if (result.ok) {
      onChange(result.url);
      toast.success("Document uploaded.");
    } else {
      toast.error(result.error);
    }
  }

  const kind = value ? cmsDocumentKind(value) : null;
  const Icon = kind === "image" ? ImageIcon : kind === "pdf" ? FileText : Paperclip;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="size-full object-contain" />
          ) : (
            <Icon className="text-muted-foreground size-5" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          {value ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground truncate text-xs hover:underline"
            >
              {cmsDocumentLabel(value)} · view
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">No document attached</span>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
              {value ? "Replace" : "Upload"}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                <X className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={CMS_DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          // Clear so re-picking the same file fires change again.
          e.target.value = "";
        }}
      />
      {help ? <p className="text-muted-foreground text-xs">{help}</p> : null}
    </div>
  );
}
