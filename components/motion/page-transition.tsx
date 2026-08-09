"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/components/motion/motion-config";

/**
 * Cinematic-cut transition between dashboard routes — outgoing content
 * fades out, incoming content fades/drifts up in. Meant to wrap only the
 * routed `{children}`, inside the persistent dashboard layout, so
 * Sidebar/TopNav/GuestBanner never remount — just the page content does.
 *
 * Uses `popLayout` rather than `wait`: with `wait`, the old page would
 * have to finish exiting before the new one even mounts, which would also
 * delay the movie-poster shared transition (MovieCard → MovieHero) that
 * depends on both existing close enough in time to bridge.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: DURATION.page, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
