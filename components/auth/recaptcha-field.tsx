"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// The client half of reCAPTCHA: mint a token the server (lib/recaptcha) can verify. Supports
// both versions the admin can pick in Plugins:
//   v2 — the "I'm not a robot" checkbox; the token is whatever the user's interaction produced.
//   v3 — invisible; a token is executed on demand at submit time, carrying an action name.
//
// Renders nothing (and mints "") when reCAPTCHA is disabled or unconfigured, so a form can mount
// this unconditionally and let the admin toggle decide whether it does anything.

type RenderOptions = {
  sitekey: string;
  size?: "normal" | "compact";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type Grecaptcha = {
  ready: (cb: () => void) => void;
  render: (el: HTMLElement, options: RenderOptions) => number;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

export type RecaptchaConfig = {
  enabled: boolean;
  siteKey: string;
  version: "v2" | "v3";
};

export type RecaptchaHandle = {
  // A token, or "" when reCAPTCHA is off, not yet loaded, or (v2) the box is unchecked. The
  // server decides whether "" is acceptable — verifyRecaptcha fails closed while enabled — so
  // the form never has to reason about the disabled case itself.
  getToken: () => Promise<string>;
  reset: () => void;
};

// One script load per src, shared across every instance and React StrictMode's double-mount.
// v2 and v3 use different src URLs but never coexist on a page (a page picks one version), so a
// single cached promise is enough.
let scriptPromise: Promise<Grecaptcha> | null = null;

function loadGrecaptcha(src: string): Promise<Grecaptcha> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Grecaptcha>((resolve, reject) => {
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => resolve(window.grecaptcha!));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.grecaptcha) return reject(new Error("grecaptcha missing after load"));
      window.grecaptcha.ready(() => resolve(window.grecaptcha!));
    };
    script.onerror = () => reject(new Error("failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const RecaptchaField = forwardRef<
  RecaptchaHandle,
  { config: RecaptchaConfig; action?: string }
>(function RecaptchaField({ config, action = "submit" }, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  const active = config.enabled && Boolean(config.siteKey);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const src =
      config.version === "v3"
        ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(config.siteKey)}`
        : "https://www.google.com/recaptcha/api.js?render=explicit";

    loadGrecaptcha(src)
      .then((grecaptcha) => {
        if (cancelled) return;
        // v2 draws a checkbox into our box exactly once; v3 has no visible widget.
        if (config.version === "v2" && boxRef.current && widgetId.current === null) {
          widgetId.current = grecaptcha.render(boxRef.current, { sitekey: config.siteKey });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [active, config.version, config.siteKey]);

  useImperativeHandle(
    ref,
    (): RecaptchaHandle => ({
      async getToken() {
        if (!active) return "";
        const grecaptcha = window.grecaptcha;
        if (!grecaptcha) return "";
        try {
          if (config.version === "v3") {
            return await grecaptcha.execute(config.siteKey, { action });
          }
          return widgetId.current !== null ? grecaptcha.getResponse(widgetId.current) : "";
        } catch {
          return "";
        }
      },
      reset() {
        if (config.version === "v2" && window.grecaptcha && widgetId.current !== null) {
          window.grecaptcha.reset(widgetId.current);
        }
      },
    }),
    [active, config.version, config.siteKey, action],
  );

  if (!active) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {config.version === "v2" ? <div ref={boxRef} /> : null}
      {failed ? (
        <p className="text-xs text-red-500">
          Couldn&apos;t load the captcha. Refresh the page and try again.
        </p>
      ) : null}
      {config.version === "v3" ? (
        <p className="text-[11px] text-white/50">This site is protected by reCAPTCHA.</p>
      ) : null}
    </div>
  );
});
