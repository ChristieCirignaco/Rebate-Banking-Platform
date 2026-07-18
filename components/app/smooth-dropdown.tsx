"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";

// A reusable "smooth dropdown", adapted from uselayouts (uselayouts.com/docs/components/
// smooth-dropdown): a SINGLE element that morphs its own width/height from the trigger into the
// panel with a spring, the trigger fading out as the measured content fades in. Used by the
// bottom-nav menu (opens upward) and the header language / notification dropdowns (open downward).
//
// Controlled: the parent owns `open`, so it can do work when the panel opens (e.g. fetch). Closes
// on click-outside. It only animates a single element's box — it never portals — so a header
// panel drops down over the content beneath; its parent must not clip overflow.

type Side = "top" | "bottom"; // which way the panel grows
type Align = "start" | "end"; // which edge it's anchored to

export function SmoothDropdown({
  open,
  onOpenChange,
  side = "bottom",
  align = "end",
  collapsedWidth,
  collapsedHeight,
  panelWidth,
  containerClassName,
  trigger,
  triggerClassName,
  panelClassName,
  overlay,
  children,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: Side;
  align?: Align;
  collapsedWidth: number;
  collapsedHeight: number;
  panelWidth: number;
  containerClassName?: string; // the footprint the trigger occupies in its parent (size / flex)
  trigger: ReactNode; // collapsed content (an icon, or a labelled tab)
  triggerClassName?: string; // styling for the collapsed trigger surface
  panelClassName?: string; // classes on the panel body (padding etc.); caller caps its own scroll
  overlay?: ReactNode; // shown over the collapsed trigger and NOT clipped — e.g. an unread badge
  children: ReactNode; // panel content
  label?: string; // accessible name for the trigger
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentRef, contentBounds] = useMeasure();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onOpenChange]);

  const openHeight = Math.max(collapsedHeight, Math.ceil(contentBounds.height));
  const vertical = side === "bottom" ? "top" : "bottom";
  const horizontal = align === "end" ? "right" : "left";

  return (
    <div ref={containerRef} className={cn("relative", containerClassName)}>
      <motion.div
        initial={false}
        animate={{
          width: open ? panelWidth : collapsedWidth,
          height: open ? openHeight : collapsedHeight,
          borderRadius: open ? 16 : collapsedHeight / 2,
        }}
        transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
        style={{ transformOrigin: `${vertical} ${horizontal}`, [vertical]: 0, [horizontal]: 0 }}
        // z only while open, so the wide panel sits above sibling content (which may come later in
        // the DOM); collapsed, it stays in normal flow so adjacent triggers don't overlap.
        className={cn("absolute cursor-pointer overflow-hidden", open && "z-50")}
        role="button"
        aria-expanded={open}
        aria-label={label}
        tabIndex={0}
        onClick={() => !open && onOpenChange(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpenChange(true);
          }
        }}
      >
        {/* Card surface — fades in as the box grows, so collapsed reads as the bare trigger and
            open reads as a panel, all one morphing element. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        />

        {/* Collapsed trigger — fades out on open. */}
        <motion.div
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          style={{ pointerEvents: open ? "none" : "auto" }}
          className={cn("absolute inset-0 flex items-center justify-center", triggerClassName)}
        >
          {trigger}
        </motion.div>

        {/* Panel content — measured (so the morph targets its height), fades in. The caller caps
            its own scrollable region, so the measured height stays within the viewport. */}
        <div ref={contentRef} className="relative">
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: 0.2, delay: open ? 0.08 : 0 }}
            style={{ pointerEvents: open ? "auto" : "none", width: panelWidth }}
            className={panelClassName}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>

      {/* Non-clipped overlay over the collapsed trigger (the morph itself hides overflow). Shown
          only while collapsed; when open the panel covers this spot anyway. */}
      {overlay && !open ? (
        <div className="pointer-events-none absolute inset-0">{overlay}</div>
      ) : null}
    </div>
  );
}
