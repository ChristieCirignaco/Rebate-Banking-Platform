import type { GatewaySlug } from "@/lib/payment-gateways/config";

export type GatewayStatus = "active" | "inactive";

// The safe, client-facing view of a gateway. Secret values are NEVER included — only a
// per-field boolean saying whether one is currently stored (secretsSet). Non-sensitive
// field values (mode, email, public keys) are exposed so the modal can pre-fill them.
export interface PaymentGatewayView {
  id: string;
  slug: GatewaySlug;
  name: string;
  logo: string;
  supportedCurrencies: string[];
  withdrawAvailable: boolean;
  status: GatewayStatus;
  webhookUrl: string | null;
  values: Record<string, string>;
  secretsSet: Record<string, boolean>;
}

// Update payload: status plus only the credential fields the admin actually changed
// (blank sensitive fields are omitted, keeping the stored secret).
export interface UpdateGatewayPayload {
  status: GatewayStatus;
  credentials: Record<string, string>;
}
