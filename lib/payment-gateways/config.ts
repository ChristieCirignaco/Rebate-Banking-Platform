// Static gateway metadata + credential field schemas. Pure (no server-only imports) so
// both the server data layer and the client modal can drive off it. The webhook URL is
// derived server-side and passed to the client as data — never computed here.

export type GatewaySlug = "paypal" | "stripe" | "paystack" | "cryptomus";
export type GatewayFieldType = "text" | "password" | "email" | "select";

export interface GatewayFieldDef {
  key: string;
  label: string;
  type: GatewayFieldType;
  // sensitive fields are encrypted at rest, never sent to the client (only an isSet flag),
  // and only overwritten when the admin supplies a new value.
  sensitive: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface GatewayConfig {
  slug: GatewaySlug;
  name: string;
  logo: string;
  brandColor: string;
  hasWebhook: boolean;
  fields: GatewayFieldDef[];
}

export const GATEWAY_SLUGS: GatewaySlug[] = [
  "paypal",
  "stripe",
  "paystack",
  "cryptomus",
];

export const GATEWAY_CONFIGS: Record<GatewaySlug, GatewayConfig> = {
  paypal: {
    slug: "paypal",
    name: "PayPal",
    logo: "/gateways/paypal.svg",
    brandColor: "#003087",
    hasWebhook: true,
    fields: [
      { key: "clientId", label: "Client Id", type: "text", sensitive: false },
      { key: "clientSecret", label: "Client Secret", type: "password", sensitive: true },
      { key: "appId", label: "App Id", type: "text", sensitive: false },
      {
        key: "mode",
        label: "Mode",
        type: "select",
        sensitive: false,
        options: [
          { value: "sandbox", label: "Sandbox" },
          { value: "live", label: "Live" },
        ],
      },
    ],
  },
  stripe: {
    slug: "stripe",
    name: "Stripe",
    logo: "/gateways/stripe.svg",
    brandColor: "#635bff",
    hasWebhook: true,
    fields: [
      { key: "stripeKey", label: "Stripe Key", type: "text", sensitive: false, placeholder: "pk_live_…" },
      { key: "stripeSecret", label: "Stripe Secret", type: "password", sensitive: true, placeholder: "sk_live_…" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", sensitive: true, placeholder: "whsec_…" },
    ],
  },
  paystack: {
    slug: "paystack",
    name: "Paystack",
    logo: "/gateways/paystack.svg",
    brandColor: "#0ba4db",
    hasWebhook: true,
    fields: [
      { key: "publicKey", label: "Public Key", type: "text", sensitive: false, placeholder: "pk_live_…" },
      { key: "secretKey", label: "Secret Key", type: "password", sensitive: true, placeholder: "sk_live_…" },
      { key: "merchantEmail", label: "Merchant Email", type: "email", sensitive: false },
    ],
  },
  cryptomus: {
    slug: "cryptomus",
    name: "Cryptomus",
    logo: "/gateways/cryptomus.svg",
    brandColor: "#0098ea",
    hasWebhook: false,
    fields: [
      { key: "apiKey", label: "Api Key", type: "password", sensitive: true },
      { key: "merchantId", label: "Merchant Id", type: "text", sensitive: false },
    ],
  },
};

export function isGatewaySlug(value: string): value is GatewaySlug {
  return (GATEWAY_SLUGS as string[]).includes(value);
}
