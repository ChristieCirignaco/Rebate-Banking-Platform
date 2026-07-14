"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

const MAX_BYTES = 256 * 1024;

// Reads the chosen image into a data URL (stored on the currency). Storage-agnostic:
// no upload endpoint / blob service needed yet; swap for object storage in production.
export function FlagUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 256 KB.");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : null);
      setReading(false);
    };
    reader.onerror = () => {
      toast.error("Could not read that image.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Flag</Label>
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Flag preview" className="size-full object-cover" />
          ) : (
            <ImagePlus className="text-muted-foreground size-5" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            {reading ? "Reading…" : value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              <X className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      <p className="text-muted-foreground text-xs">PNG, SVG or JPG up to 256 KB.</p>
    </div>
  );
}
