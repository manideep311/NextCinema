"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/components/motion/motion-config";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Scroll-reveal wrapper for grouped content blocks (a dashboard section, a
 * landing section) — opacity + a small upward drift, once per mount.
 * Deliberately not meant to wrap every paragraph individually; group
 * related content into one FadeIn per section.
 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: DURATION.page, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
