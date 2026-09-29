"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MovieProfile } from "@/types/movie";
import { MovieCard } from "@/components/features/movies/movie-card";
import { MovieCardSkeleton } from "@/components/features/movies/movie-card-skeleton";
import { staggerContainer, fadeInUp, EASE_OUT } from "@/components/motion/motion-config";

interface MovieGridProps {
  movies: Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">[];
  matchScores?: Record<number, number>;
  /** Optional one-line "why it fits" per movie, shown on hover (recommendation surfaces). */
  reasons?: Record<number, string>;
}

/**
 * Reusable responsive grid — every dashboard section, search, categories,
 * and recommendation surface renders its movies through this, so both the
 * grid breakpoints and the reveal animation only ever need to be tuned in
 * one place. Cards reveal with a small stagger (~50ms apart) on mount;
 * callers that swap `movies` without remounting (e.g. a tab switch) can
 * key this component to replay the reveal — see CategoryTabs/SearchPage.
 */
export function MovieGrid({ movies, matchScores, reasons }: MovieGridProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={reducedMotion ? undefined : staggerContainer(50)}
      initial={reducedMotion ? undefined : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      {movies.map((movie) => (
        <motion.div
          key={movie.id}
          variants={reducedMotion ? undefined : fadeInUp}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          <MovieCard movie={movie} matchScore={matchScores?.[movie.id]} reason={reasons?.[movie.id]} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
