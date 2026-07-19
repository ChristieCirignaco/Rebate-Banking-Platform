"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import type { Testimonial } from "./content";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Swipeable testimonials rail: native touch/trackpad swipe via scroll-snap, plus prev/next
// buttons that advance one card and disable at each end.
export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  function updateNav() {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateNav();
    el.addEventListener("scroll", updateNav, { passive: true });
    window.addEventListener("resize", updateNav);
    return () => {
      el.removeEventListener("scroll", updateNav);
      window.removeEventListener("resize", updateNav);
    };
  }, []);

  function scroll(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth; // card width + gap-6 (24px)
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  const navButton =
    "flex size-11 items-center justify-center rounded-full border border-[var(--trb-blue)]/20 bg-white text-[var(--trb-blue)] shadow-sm transition hover:bg-[var(--trb-blue)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[var(--trb-blue)]";

  return (
    <div className="mt-12">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t) => (
          <div
            key={t.name}
            data-card
            className="min-w-0 shrink-0 basis-[88%] snap-start sm:basis-[calc(50%-12px)] lg:basis-[calc(33.333%-16px)]"
          >
            <div className="flex h-full flex-col rounded-2xl bg-[var(--trb-blue)] p-6 text-white">
              <div className="flex items-center gap-3">
                {t.avatar ? (
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20">
                    {initials(t.name)}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="flex gap-0.5 text-[var(--trb-gold)]">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/85">{t.quote}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canPrev}
          aria-label="Previous testimonials"
          className={navButton}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canNext}
          aria-label="Next testimonials"
          className={navButton}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
