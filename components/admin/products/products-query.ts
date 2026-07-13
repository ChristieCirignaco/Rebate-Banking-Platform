import type { ReadonlyURLSearchParams } from "next/navigation";

// Build a query string from the current params with a set of updates applied.
// Empty / "all" / null values drop their key so the URL stays clean and shareable.
export function buildProductsQuery(
  current: URLSearchParams | ReadonlyURLSearchParams,
  updates: Record<string, string | number | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}
