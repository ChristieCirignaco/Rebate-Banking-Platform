import { cn } from "@/lib/utils";

// The currency flag/icon (an uploaded data URL). Falls back to the first two letters of
// the code in a rounded chip when there is no image.
export function CurrencyFlag({
  src,
  code,
  className,
}: {
  src?: string;
  code: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${code} flag`}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
        className,
      )}
    >
      {code.slice(0, 2)}
    </div>
  );
}
