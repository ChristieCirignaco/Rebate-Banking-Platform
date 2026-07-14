// Generates lib/currency-data.ts: the ISO 4217 fiat list (names + narrow symbols via
// Intl) plus a curated crypto set. Run with: node scripts/gen-currencies.mjs
import { writeFileSync } from "node:fs";

// Drop metals, funds, test and supranational special codes — keep national currencies
// (including the real X-prefixed ones: XAF, XOF, XCD, XPF).
const DENY = new Set([
  "XAU", "XAG", "XPT", "XPD", "XDR", "XUA", "XSU", "XTS", "XXX",
  "XBA", "XBB", "XBC", "XBD", "XFO", "XFU", "XRE",
]);

const nameOf = new Intl.DisplayNames(["en"], { type: "currency" });

function symbolOf(code) {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(1);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

const fiat = Intl.supportedValuesOf("currency")
  .filter((code) => !DENY.has(code))
  .map((code) => ({ code, name: nameOf.of(code) ?? code, symbol: symbolOf(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const crypto = [
  ["BTC", "Bitcoin", "₿"],
  ["ETH", "Ethereum", "Ξ"],
  ["USDT", "Tether", "₮"],
  ["USDC", "USD Coin", "$"],
  ["BNB", "BNB", "BNB"],
  ["XRP", "XRP", "XRP"],
  ["SOL", "Solana", "SOL"],
  ["ADA", "Cardano", "₳"],
  ["DOGE", "Dogecoin", "Ð"],
  ["TRX", "TRON", "TRX"],
  ["DOT", "Polkadot", "DOT"],
  ["MATIC", "Polygon", "MATIC"],
  ["LTC", "Litecoin", "Ł"],
  ["BCH", "Bitcoin Cash", "BCH"],
  ["LINK", "Chainlink", "LINK"],
  ["XLM", "Stellar", "XLM"],
  ["AVAX", "Avalanche", "AVAX"],
  ["ATOM", "Cosmos", "ATOM"],
  ["SHIB", "Shiba Inu", "SHIB"],
  ["TON", "Toncoin", "TON"],
].map(([code, name, symbol]) => ({ code, name, symbol }));

const file = `// AUTO-GENERATED — do not edit by hand. Regenerate with scripts/gen-currencies.mjs.
// ISO 4217 fiat currencies (names + narrow symbols via Intl) plus a curated crypto set.
// Populates the currency-name select and auto-suggests code + symbol.

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const FIAT_CURRENCIES: CurrencyOption[] = ${JSON.stringify(fiat, null, 2)};

export const CRYPTO_CURRENCIES: CurrencyOption[] = ${JSON.stringify(crypto, null, 2)};

export function currencyOptions(type: "fiat" | "crypto"): CurrencyOption[] {
  return type === "crypto" ? CRYPTO_CURRENCIES : FIAT_CURRENCIES;
}

export function findCurrencyOption(
  type: "fiat" | "crypto",
  code: string,
): CurrencyOption | undefined {
  return currencyOptions(type).find((option) => option.code === code);
}
`;

writeFileSync(new URL("../lib/currency-data.ts", import.meta.url), file);
console.log(`fiat: ${fiat.length}, crypto: ${crypto.length}`);
