// Programmatic control of whichever live-chat widget the admin enabled in Settings → Plugins.
// Each vendor ships its own global JS API; this normalizes the three things the app needs —
// "open the chat", "hide the floating launcher", "show it again" — across the six providers, so
// the signed-in app can drive chat from its own header button instead of the vendor's bubble.
//
// Everything here is feature-detected and best-effort. The widget script loads asynchronously
// (SitePluginScripts, afterInteractive), so an API may not exist yet when a call is made — hence
// the retry poll. Nothing throws: the worst case is a button press that does nothing until the
// script finishes loading, never a crash.
//
// IMPORTANT: these per-vendor calls follow each provider's published API but cannot be verified
// here without a real account for each. Tawk, Tidio, Smartsupp, LiveChat and Chatwoot expose
// official open/hide/show methods; JivoChat has no launcher-hide API, so it falls back to CSS.

export type ChatProvider =
  | ""
  | "tawk"
  | "tidio"
  | "jivo"
  | "smartsupp"
  | "livechat"
  | "chatwoot";

// The vendor globals are untyped third-party surfaces; a narrow any-record keeps the call sites
// readable without pretending we have real types for them.
type AnyWindow = Window & Record<string, unknown>;
/* eslint-disable @typescript-eslint/no-explicit-any */

function win(): AnyWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as AnyWindow);
}

// Retry an action that depends on the widget script being ready. Runs once immediately, then
// polls until it succeeds or the budget runs out (~5s), so a click during the load window still
// lands once the API appears.
function withRetry(action: () => boolean, attempts = 20, delayMs = 250): void {
  if (action()) return;
  let n = 0;
  const timer = setInterval(() => {
    n += 1;
    if (action() || n >= attempts) clearInterval(timer);
  }, delayMs);
}

const JIVO_HIDE_STYLE_ID = "jivo-launcher-hide";

// Toggle a <style> tag that hides Jivo's launcher — its only widget with no launcher-hide API.
function setJivoHidden(hidden: boolean): void {
  const g = win();
  if (!g) return;
  const doc = g.document;
  const existing = doc.getElementById(JIVO_HIDE_STYLE_ID);
  if (hidden) {
    if (existing) return;
    const style = doc.createElement("style");
    style.id = JIVO_HIDE_STYLE_ID;
    // jdiv is Jivo's launcher container; opening the chat window still works with it hidden.
    style.textContent = "jdiv { display: none !important; }";
    doc.head.appendChild(style);
  } else {
    existing?.remove();
  }
}

// Open the chat window for the active provider.
export function openChat(provider: ChatProvider): void {
  withRetry(() => {
    const g = win();
    if (!g) return false;
    try {
      switch (provider) {
        case "tawk": {
          const api = g.Tawk_API as any;
          if (api?.maximize) return api.showWidget?.(), api.maximize(), true;
          return false;
        }
        case "tidio": {
          const api = g.tidioChatApi as any;
          if (api?.open) return api.show?.(), api.open(), true;
          return false;
        }
        case "jivo": {
          const api = g.jivo_api as any;
          if (api?.open) return setJivoHidden(false), api.open(), true;
          return false;
        }
        case "smartsupp": {
          const fn = g.smartsupp as any;
          if (typeof fn === "function") return fn("chat:show"), fn("chat:open"), true;
          return false;
        }
        case "livechat": {
          const api = g.LiveChatWidget as any;
          if (api?.call) return api.call("maximize"), true;
          return false;
        }
        case "chatwoot": {
          const api = g.$chatwoot as any;
          if (api?.toggle) return api.toggleBubbleVisibility?.("show"), api.toggle("open"), true;
          return false;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  });
}

// Hide the vendor's floating launcher — used on the signed-in app pages, where our own header
// button is the entry point and the floating bubble would be a second, redundant one.
export function hideChatLauncher(provider: ChatProvider): void {
  withRetry(() => {
    const g = win();
    if (!g) return false;
    try {
      switch (provider) {
        case "tawk": {
          const api = g.Tawk_API as any;
          if (api?.hideWidget) return api.hideWidget(), true;
          return false;
        }
        case "tidio": {
          const api = g.tidioChatApi as any;
          if (api?.hide) return api.hide(), true;
          return false;
        }
        case "jivo":
          return setJivoHidden(true), true;
        case "smartsupp": {
          const fn = g.smartsupp as any;
          if (typeof fn === "function") return fn("chat:hide"), true;
          return false;
        }
        case "livechat": {
          const api = g.LiveChatWidget as any;
          if (api?.call) return api.call("hide"), true;
          return false;
        }
        case "chatwoot": {
          const api = g.$chatwoot as any;
          if (api?.toggleBubbleVisibility) return api.toggleBubbleVisibility("hide"), true;
          return false;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  });
}

// Restore the floating launcher — used when leaving the app pages for a surface (marketing,
// auth) where the bubble should behave normally again.
export function showChatLauncher(provider: ChatProvider): void {
  withRetry(() => {
    const g = win();
    if (!g) return false;
    try {
      switch (provider) {
        case "tawk": {
          const api = g.Tawk_API as any;
          if (api?.showWidget) return api.showWidget(), true;
          return false;
        }
        case "tidio": {
          const api = g.tidioChatApi as any;
          if (api?.show) return api.show(), true;
          return false;
        }
        case "jivo":
          return setJivoHidden(false), true;
        case "smartsupp": {
          const fn = g.smartsupp as any;
          if (typeof fn === "function") return fn("chat:show"), true;
          return false;
        }
        case "livechat": {
          const api = g.LiveChatWidget as any;
          if (api?.call) return api.call("minimize"), true;
          return false;
        }
        case "chatwoot": {
          const api = g.$chatwoot as any;
          if (api?.toggleBubbleVisibility) return api.toggleBubbleVisibility("show"), true;
          return false;
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
