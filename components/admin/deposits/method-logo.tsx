import { cn } from "@/lib/utils";

// A deposit method's logo: its own uploaded logo, else the linked gateway's logo, else a
// monogram fallback. Plain <img> (data URLs / static gateway svgs), storage-agnostic.
export function MethodLogo({
  logo,
  gatewayLogo,
  name,
  className,
}: {
  logo?: string | null;
  gatewayLogo?: string | null;
  name: string;
  className?: string;
}) {
  const src = logo || gatewayLogo;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        className={cn("shrink-0 rounded-md object-contain", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md text-xs font-bold uppercase",
        className,
      )}
    >
      {name.slice(0, 2)}
    </div>
  );
}
