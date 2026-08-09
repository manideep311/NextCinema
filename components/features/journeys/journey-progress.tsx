"use client";

import { motion, useReducedMotion } from "framer-motion";

interface JourneyProgressProps {
  watchedCount: number;
  totalCount: number;
  /** Compact variant drops the "watched" word for tight spaces (dashboard strip). */
  compact?: boolean;
  className?: string;
}

/**
 * A thin progress bar — deliberately restrained (no percentage badge, no
 * "3 remaining" countdown chip) so it reads as journey progress rather
 * than a productivity tracker. Fill animates via `scaleX` (cheap,
 * transform-only) instead of animating `width`.
 */
export function JourneyProgress({ watchedCount, totalCount, compact = false, className = "" }: JourneyProgressProps) {
  const reducedMotion = useReducedMotion();
  const ratio = totalCount > 0 ? Math.min(1, watchedCount / totalCount) : 0;

  return (
    <div className={className}>
      <p className="text-xs text-muted mb-1.5">
        {watchedCount} / {totalCount}
        {!compact && " watched"}
      </p>
      <div className="h-[3px] w-full rounded-full bg-white/[0.07] overflow-hidden">
        <motion.div
          initial={reducedMotion ? { scaleX: ratio } : { scaleX: 0 }}
          animate={{ scaleX: ratio }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "left" }}
          className="h-full rounded-full bg-primary/70"
        />
      </div>
    </div>
  );
}
