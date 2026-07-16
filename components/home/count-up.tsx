"use client";

import { useEffect, useRef, useState } from "react";

// Count-up number. Mirrors the reference `.sv-counter`: animates 0 → target once the
// element is 50% visible, then stops. `value` may be a string like "$0" or "24/7" —
// only the numeric part is animated; static values (e.g. "24/7") render as-is.
export function CountUp({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 1600,
  className = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);
          const start = performance.now();
          const factor = 10 ** decimals;
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / durationMs);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(eased * target * factor) / factor);
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}
