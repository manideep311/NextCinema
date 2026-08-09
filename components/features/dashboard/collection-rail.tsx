"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { MovieCard } from "@/components/features/movies/movie-card";
import { MovieCardSkeleton } from "@/components/features/movies/movie-card-skeleton";
import { staggerContainer, fadeInUp, EASE_OUT } from "@/components/motion/motion-config";
import { MIN_COLLECTION_SIZE_TO_SHOW, type DiscoveryMovie } from "@/types/discovery";

interface CollectionRailProps {
  title: string;
  description: string;
  /** `null` = this collection's request failed; `undefined` while the
   *  parent's combined fetch is still loading; an array (possibly empty)
   *  once it has genuinely resolved. */
  movies: DiscoveryMovie[] | null | undefined;
  isLoading: boolean;
  onRetry?: () => void;
}

/**
 * A single editorial collection — heading, one-line description, and a
 * horizontally scrollable rail of posters (never a tall grid). Reuses the
 * exact same MovieCard everywhere else in the app uses, so favorite/
 * watchlist/hover behavior and the poster page transition all come for
 * free instead of being reimplemented per collection.
 */
export function CollectionRail({ title, description, movies, isLoading, onRetry }: CollectionRailProps) {
  const reducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <section className="mb-12">
        <h2 className="font-serif text-xl mb-1">{title}</h2>
        <p className="text-sm text-muted mb-4">{description}</p>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-36 sm:w-40 md:w-44 shrink-0">
              <MovieCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Request for this collection failed outright — compact retry, not a
  // broken/blank section, and it never takes the rest of the page with it.
  if (movies === null) {
    return (
      <section className="mb-12">
        <h2 className="font-serif text-xl mb-1">{title}</h2>
        <div className="flex items-center gap-3 text-sm text-muted py-6 border border-dashed border-white/10 rounded-lg px-5">
          <span>Couldn&apos;t load this collection right now.</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-primary hover:underline shrink-0"
            >
              <RotateCcw className="size-3.5" /> Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  // Not enough results to feel like a real curated row — hide rather than
  // show a heading over one or two lonely posters (or nothing at all).
  // (`movies` can only still be `undefined` here in an impossible-in-practice
  // transient state — treated the same as "hide" rather than throwing.)
  if (!movies || movies.length < MIN_COLLECTION_SIZE_TO_SHOW) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="font-serif text-xl mb-1">{title}</h2>
      <p className="text-sm text-muted mb-4">{description}</p>
      <motion.div
        variants={reducedMotion ? undefined : staggerContainer(40)}
        initial={reducedMotion ? undefined : "hidden"}
        animate={reducedMotion ? undefined : "visible"}
        className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1"
      >
        {movies.map((movie) => (
          <motion.div
            key={movie.id}
            variants={reducedMotion ? undefined : fadeInUp}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="w-36 sm:w-40 md:w-44 shrink-0"
          >
            <MovieCard movie={movie} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
