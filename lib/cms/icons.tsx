// Curated icon set for CMS "icon" fields. Content stores the kebab-case name;
// renderers and the admin picker resolve it here. Client-safe.
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Coins,
  DollarSign,
  Flag,
  Gift,
  Globe,
  Headphones,
  HelpCircle,
  IdCard,
  Landmark,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Quote,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
  Upload,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Null prototype: icon names come from admin input, and a plain object literal
// would let prototype keys ("constructor", "__proto__") pass allowlist lookups.
export const CMS_ICONS: Record<string, LucideIcon> = Object.assign(
  Object.create(null) as Record<string, LucideIcon>,
  {
  "badge-check": BadgeCheck,
  banknote: Banknote,
  "check-circle": CheckCircle2,
  coins: Coins,
  "dollar-sign": DollarSign,
  flag: Flag,
  gift: Gift,
  globe: Globe,
  headphones: Headphones,
  "help-circle": HelpCircle,
  "id-card": IdCard,
  landmark: Landmark,
  lock: Lock,
  mail: Mail,
  "message-circle": MessageCircle,
  phone: Phone,
  quote: Quote,
  shield: Shield,
  "shield-check": ShieldCheck,
  star: Star,
  "trending-up": TrendingUp,
  upload: Upload,
  "user-plus": UserPlus,
  zap: Zap,
  },
);

export const CMS_ICON_NAMES = Object.keys(CMS_ICONS).sort();

export function CmsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CMS_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
