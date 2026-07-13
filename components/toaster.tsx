"use client";

import { Toaster as HotToaster } from "react-hot-toast";

// App-wide toast host (react-hot-toast). Styled with the design tokens so toasts
// match light/dark automatically. Fire toasts via `toast` from @/lib/toast.
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: { primary: "var(--primary)", secondary: "var(--primary-foreground)" },
        },
        error: {
          iconTheme: { primary: "var(--destructive)", secondary: "var(--primary-foreground)" },
        },
      }}
    />
  );
}
