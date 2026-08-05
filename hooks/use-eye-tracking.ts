"use client";

import { useEffect, useRef, useState } from "react";

const MAX_OFFSET = 2.4; // px — subtle, not cartoonish googly eyes

/**
 * Tracks the cursor relative to `containerRef`'s center and returns a
 * small clamped {x, y} offset, meant to nudge an eye/pupil element toward
 * the cursor. No-ops on touch-only devices (no mouse to track) and when
 * the user prefers reduced motion.
 */
export function useEyeTracking(containerRef: React.RefObject<HTMLElement | null>) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchOnly = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion || isTouchOnly) return;

    function handleMouseMove(e: MouseEvent) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.hypot(dx, dy) || 1;

        setOffset({
          x: (dx / distance) * MAX_OFFSET,
          y: (dy / distance) * MAX_OFFSET,
        });
      });
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return offset;
}
