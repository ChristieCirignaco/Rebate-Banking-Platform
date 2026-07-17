"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

// Dark mode is deliberately scoped to /admin. next-themes toggles the `.dark` class on
// <html> (which is global), so when the admin area unmounts — a client-side navigation to the
// marketing or user-facing surfaces, both of which are light-only by design — we strip the
// class here. Without this, those pages would inherit the admin's dark class and render
// broken. Re-entering /admin remounts this provider and next-themes re-applies the admin's
// stored choice from localStorage.
function StripThemeClassOnUnmount() {
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.style.colorScheme = "";
    };
  }, []);
  return null;
}

// Wrap only the authenticated admin shell. `defaultTheme="system"` makes the admin follow the
// operating system on first visit (dark OS → dark admin); the header toggle overrides it with
// an explicit light/dark/system choice, persisted under a dedicated storage key so it never
// bleeds into any other next-themes usage elsewhere.
export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="admin-theme"
      disableTransitionOnChange
    >
      <StripThemeClassOnUnmount />
      {children}
    </ThemeProvider>
  );
}
