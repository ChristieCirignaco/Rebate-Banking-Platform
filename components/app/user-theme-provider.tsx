"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

// Dark mode for the authenticated user area, scoped exactly like AdminThemeProvider is for
// /admin. next-themes toggles the `.dark` class on <html> (which is global), so when the user
// area unmounts — a client-side navigation to the marketing or auth surfaces, which are
// light-only by design — we strip the class here. Without this, those pages would inherit the
// user's dark class and render broken. Re-entering the app remounts this provider and
// next-themes re-applies the stored choice from localStorage.
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

// Wrap only the authenticated user shell. A dedicated storageKey keeps this choice separate
// from the admin's ("admin-theme"), so an admin who also uses the app doesn't have the two
// preferences bleed into each other. `defaultTheme="system"` follows the OS on first visit;
// the header toggle overrides it with an explicit light/dark/system choice.
export function UserThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="user-theme"
      disableTransitionOnChange
    >
      <StripThemeClassOnUnmount />
      {children}
    </ThemeProvider>
  );
}
