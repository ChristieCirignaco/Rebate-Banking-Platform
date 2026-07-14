import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CURRENCY_ROLES,
  type CurrencyRoleConfig,
  type CurrencyRoleKey,
  type CurrencyType,
} from "./types";

export function TypeBadge({ type }: { type: CurrencyType }) {
  return type === "crypto" ? (
    <Badge className="border-transparent bg-violet-500/12 text-violet-600 dark:text-violet-400">
      CRYPTO
    </Badge>
  ) : (
    <Badge className="border-transparent bg-blue-500/12 text-blue-600 dark:text-blue-400">
      FIAT
    </Badge>
  );
}

export function DefaultBadge() {
  return (
    <Badge className="border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400">
      Default
    </Badge>
  );
}

const ROLE_TINTS: Record<CurrencyRoleKey, string> = {
  sender: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  voucher: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  payment: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
  withdraw: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
};

const ROLE_LABEL = Object.fromEntries(
  CURRENCY_ROLES.map((role) => [role.key, role.label]),
) as Record<CurrencyRoleKey, string>;

export function RoleBadges({ roles }: { roles: CurrencyRoleConfig[] }) {
  const enabled = roles.filter((role) => role.enabled);
  if (enabled.length === 0) {
    return <span className="text-muted-foreground text-xs">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {enabled.map((role) => (
        <Badge
          key={role.role}
          className={cn("border-transparent uppercase", ROLE_TINTS[role.role])}
        >
          {ROLE_LABEL[role.role]}
        </Badge>
      ))}
    </div>
  );
}
