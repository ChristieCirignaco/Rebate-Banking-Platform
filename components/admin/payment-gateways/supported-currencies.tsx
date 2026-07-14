import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SupportedCurrencies({
  currencies,
  max = 3,
}: {
  currencies: string[];
  max?: number;
}) {
  if (currencies.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const shown = currencies.slice(0, max);
  const rest = currencies.slice(max);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((code) => (
        <Badge key={code} variant="secondary" className="font-mono text-xs">
          {code}
        </Badge>
      ))}
      {rest.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${rest.length} more currencies: ${rest.join(", ")}`}
              className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Badge variant="outline" className="cursor-pointer text-xs">
                +{rest.length}
              </Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-56">
            <div className="flex flex-wrap gap-1">
              {rest.map((code) => (
                <Badge key={code} variant="secondary" className="font-mono text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
