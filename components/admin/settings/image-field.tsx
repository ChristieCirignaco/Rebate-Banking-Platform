"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { MAX_MEDIA_BYTES, MEDIA_ACCEPT, uploadMedia } from "@/lib/media";
import { SettingsField } from "./settings-ui";

// Uploads the chosen image to object storage via /api/admin/media and stores the returned
// URL (not a base64 data URL). Generalized from deposits/logo-upload for reuse in Settings.
export function ImageField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error("Image must be under 512 KB.");
      return;
    }
    setUploading(true);
    const result = await uploadMedia(file);
    setUploading(false);
    if (result.ok) onChange(result.url);
    else toast.error(result.error);
  }

  return (
    <SettingsField label={label} description={description}>
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="size-full object-contain" />
          ) : (
            <ImagePlus className="text-muted-foreground size-5" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          aria-label={`Upload ${label} image`}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </SettingsField>
  );
}
