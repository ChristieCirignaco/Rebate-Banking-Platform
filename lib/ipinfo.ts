import { cache } from "react";

import { getSettings } from "@/lib/settings/store";

export interface IpInfo {
  country?: string; // ISO-2 code, e.g. "US"
  city?: string;
  region?: string;
  org?: string; // ASN / network operator
}

// One IPinfo lookup, memoized per request (and cached in Next's data cache for a day, since
// IP geolocation rarely changes) so a page with many repeated IPs makes few API calls.
const lookupOne = cache(async (ip: string, token: string): Promise<IpInfo | null> => {
  try {
    const res = await fetch(
      `https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      country?: string;
      city?: string;
      region?: string;
      org?: string;
      bogon?: boolean;
    };
    if (data.bogon) return null; // private / reserved address — nothing to resolve
    return { country: data.country, city: data.city, region: data.region, org: data.org };
  } catch {
    return null;
  }
});

// Resolve a set of IPs to geo/network data via IPinfo when the plugin is enabled and a token
// is configured. Returns null when disabled so callers fall back to the raw IP + profile
// country. Best-effort: individual failures are omitted, never thrown.
export async function lookupIps(ips: string[]): Promise<Map<string, IpInfo> | null> {
  const plugins = await getSettings("plugins");
  if (!plugins.ipinfoEnabled || !plugins.ipinfoToken) return null;

  const distinct = [...new Set(ips.filter((ip) => ip && ip !== "—"))];
  const result = new Map<string, IpInfo>();
  await Promise.all(
    distinct.map(async (ip) => {
      const info = await lookupOne(ip, plugins.ipinfoToken);
      if (info) result.set(ip, info);
    }),
  );
  return result;
}
