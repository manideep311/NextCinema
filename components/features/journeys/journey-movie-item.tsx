"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Play } from "lucide-react";
import type { ResolvedJourneyMovie } from "@/types/journey";
import { moviePosterLayoutId, POSTER_TRANSITION } from "@/components/motion/movie-poster-transition";

interface JourneyMovieItemProps {
  movie: ResolvedJourneyMovie;
  /** Smaller poster + no runtime line — used in the compact Continue
   *  Journey previews (dashboard strip, movie-detail mini list). */
  compact?: boolean;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * A single journey entry — poster, title, year/runtime, and one of three
 * states (watched / next / upcoming). The "next" state gets the strongest
 * visual treatment (gold ring, WATCH NEXT label, slight scale) since the
 * whole point of the feature is that this one card should be unmissable.
 *
 * Clicking through reuses the app's signature poster→detail shared
 * transition (same layoutId contract as MovieCard/MovieHero) rather than
 * introducing a second, journey-specific one.
 */
export function JourneyMovieItem({ movie, compact = false }: JourneyMovieItemProps) {
  const reducedMotion = useReducedMotion();
  const isNext = movie.state === "next";
  const isWatched = movie.state === "watched";
  const runtime = formatRuntime(movie.runtime);

  const card = (
    <motion.div
      whileHover={movie.id ? { y: -3 } : undefined}
      whileTap={movie.id ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`relative rounded-lg overflow-hidden ring-1 transition-shadow ${
        isNext
          ? "ring-primary/60 shadow-lg shadow-primary/10"
          : "ring-white/[0.06]"
      } ${isWatched ? "opacity-70" : ""} ${compact ? "w-28 shrink-0" : "w-full max-w-[220px]"}`}
    >
      <div className="relative aspect-[2/3] bg-surface">
        {movie.posterPath ? (
          <motion.div
            layoutId={reducedMotion || !movie.id ? undefined : moviePosterLayoutId(movie.id)}
            transition={POSTER_TRANSITION}
            className="absolute inset-0"
          >
            <Image
              src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
              alt={movie.title}
              fill
              sizes={compact ? "112px" : "220px"}
              className="object-cover"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-[11px] px-3 text-center">
            Poster unavailable
          </div>
        )}

        {isNext && !reducedMotion && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 ring-2 ring-primary/70 rounded-lg pointer-events-none"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <h3 className={`font-medium leading-snug text-text ${compact ? "text-xs" : "text-sm"} line-clamp-2`}>
            {movie.title}
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            {movie.releaseYear}
            {!compact && runtime && ` · ${runtime}`}
          </p>
        </div>
      </div>

      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium tracking-wide ${
          isNext
            ? "bg-primary/15 text-primary"
            : isWatched
              ? "bg-white/[0.03] text-muted"
              : "bg-white/[0.03] text-muted"
        }`}
      >
        {isWatched && (
          <>
            <Check className="size-3" /> WATCHED
          </>
        )}
        {isNext && (
          <>
            <Play className="size-3 fill-current" /> WATCH NEXT
          </>
        )}
        {!isWatched && !isNext && <span className="size-1.5 rounded-full bg-muted/60 ml-0.5" />}
        {!isWatched && !isNext && "UP NEXT"}
      </div>
    </motion.div>
  );

  if (!movie.id) {
    return <div className="cursor-default">{card}</div>;
  }

  return (
    <Link href={`/dashboard/movie/${movie.id}`} className="block group/journey-card">
      {card}
    </Link>
  );
}
