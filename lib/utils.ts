import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar-fallback initials from a display name. Plain function (no "use client"), so it's
// safely callable from Server Components — components/admin/deposits/shared.tsx's own
// `initials` export is client-only because that whole module is "use client".
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
