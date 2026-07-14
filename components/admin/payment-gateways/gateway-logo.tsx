import { GATEWAY_CONFIGS, type GatewaySlug } from "@/lib/payment-gateways/config";
import { cn } from "@/lib/utils";

export function GatewayLogo({
  slug,
  logo,
  name,
  className,
}: {
  slug: GatewaySlug;
  logo?: string;
  name: string;
  className?: string;
}) {
  const src = logo || GATEWAY_CONFIGS[slug]?.logo;
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
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md text-xs font-bold",
        className,
      )}
    >
      {name.slice(0, 2)}
    </div>
  );
}
