import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

// The product picture the user uploaded. A plain <img> is used deliberately: the upload
// pipeline/storage location isn't fixed yet, so we stay storage-agnostic instead of
// coupling to a next/image remote-domain config. Falls back to a labeled placeholder
// when the submission has no image.
export function ProductImage({
  src,
  alt,
  className,
  iconClassName,
  showLabel = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1 rounded-md",
          className,
        )}
      >
        <ImageOff className={cn("size-4", iconClassName)} />
        {showLabel ? <span className="text-xs">No Image</span> : null}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("bg-muted rounded-md object-cover", className)}
    />
  );
}
