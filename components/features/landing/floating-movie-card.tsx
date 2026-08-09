"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface PosterTileProps {
  title: string;
  posterPath: string | null;
  /** Positioning + sizing utility classes (top/left/right/bottom, width, z-index) — the collage layout lives in the parent so this stays a dumb, reusable tile. */
  className?: string;
  rotate?: number;
  delay?: number;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * A single poster in the hero's asymmetric collage. Physical-poster feel —
 * slight rotation, soft shadow, a hairline edge — with a one-time entrance
 * (no infinite floating loop) and a restrained hover lift. Purely
 * decorative, so it's marked aria-hidden.
 */
export function FloatingMovieCard({ title, posterPath, className = "", rotate = 0, delay = 0 }: PosterTileProps) {
  if (!posterPath) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 28, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      style={{ rotate: `${rotate}deg` }}
      className={`absolute rounded-lg overflow-hidden ring-1 ring-white/[0.07] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)] ${className}`}
    >
      <div className="relative aspect-[2/3] bg-surface">
        <Image
          src={`${IMAGE_BASE_URL}/w500${posterPath}`}
          alt={title}
          fill
          sizes="(max-width: 1024px) 35vw, 260px"
          className="object-cover"
        />
      </div>
    </motion.div>
  );
}