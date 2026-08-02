"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface FloatingMovieCardProps {
  title: string;
  posterPath: string | null;
  /** Position as percentages, so cards scale naturally with viewport size */
  top: string;
  left: string;
  /** Stagger delay in seconds, and a distinct float duration so cards don't move in unison */
  delay: number;
  floatDuration: number;
  rotate: number;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * A single decorative poster that gently floats up/down forever once
 * mounted. Purely visual — not interactive, not keyboard-focusable —
 * so it's marked aria-hidden to avoid confusing screen reader users.
 */
export function FloatingMovieCard({
  title,
  posterPath,
  top,
  left,
  delay,
  floatDuration,
  rotate,
}: FloatingMovieCardProps) {
  if (!posterPath) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -16, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        scale: { duration: 0.6, delay },
        y: { duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay },
      }}
      style={{ top, left, rotate: `${rotate}deg` }}
      className="absolute w-28 md:w-36 rounded-xl overflow-hidden glass shadow-2xl hidden sm:block"
    >
      <Image
        src={`${IMAGE_BASE_URL}/w342${posterPath}`}
        alt={title}
        width={342}
        height={513}
        className="w-full h-auto"
      />
    </motion.div>
  );
}