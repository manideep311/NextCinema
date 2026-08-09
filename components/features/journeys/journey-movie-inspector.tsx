"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Play, Film } from "lucide-react";
import type { ResolvedJourneyMovie } from "@/types/journey";
import { WatchlistButton } from "@/components/features/movies/watchlist-button";
import { modalVariants, modalTransition } from "@/components/motion/motion-config";

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

interface JourneyMovieInspectorProps {
  movie: ResolvedJourneyMovie | null;
  position: number;
  totalInOrder: number;
  orderLabel: string;
  isNextMovie: boolean;
  onClose: () => void;
}

/**
 * Lets the user look at a movie from the track without leaving the
 * journey — clicking a poster opens this instead of navigating straight
 * to the movie page. "View Movie" / "Watch Next" (whichever applies) is
 * the only way this panel actually navigates away.
 */
export function JourneyMovieInspector({ movie, position, totalInOrder, orderLabel, isNextMovie, onClose }: JourneyMovieInspectorProps) {
  const runtime = movie ? formatRuntime(movie.runtime) : null;
  const description = movie?.overview || movie?.tagline || null;

  return (
    <AnimatePresence>
      {movie && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={movie.title}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
            className="relative w-full md:max-w-md glass rounded-t-2xl md:rounded-2xl shadow-2xl p-5 pointer-events-auto max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-muted hover:text-text z-10"
            >
              <X className="size-4" />
            </button>

            <div className="flex gap-4 mb-4">
              <div className="relative w-20 aspect-[2/3] shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
                {movie.posterPath ? (
                  <Image
                    src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-surface flex items-center justify-center text-muted text-[10px] text-center px-1">
                    No poster
                  </div>
                )}
              </div>

              <div className="min-w-0 pt-1">
                <p className="text-[11px] uppercase tracking-[0.15em] text-primary mb-1 flex items-center gap-1.5">
                  <Film className="size-3" /> {orderLabel} · #{position} of {totalInOrder}
                </p>
                <h2 className="font-serif text-lg leading-snug mb-1 text-balance">{movie.title}</h2>
                <p className="text-xs text-muted mb-2">
                  {movie.releaseYear}
                  {runtime && ` · ${runtime}`}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                    movie.state === "watched"
                      ? "bg-primary/15 text-primary"
                      : movie.state === "next"
                        ? "bg-primary/15 text-primary"
                        : "bg-white/5 text-muted"
                  }`}
                >
                  {movie.state === "watched" && (
                    <>
                      <Check className="size-3" /> Watched
                    </>
                  )}
                  {movie.state === "next" && (
                    <>
                      <Play className="size-2.5 fill-current" /> Watch Next
                    </>
                  )}
                  {movie.state === "upcoming" && "Upcoming"}
                </span>
              </div>
            </div>

            {description && <p className="text-sm text-muted leading-relaxed mb-5 line-clamp-4">{description}</p>}

            <div className="flex flex-wrap gap-2.5">
              {movie.id && (
                <Link
                  href={`/dashboard/movie/${movie.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/85 transition-colors"
                >
                  <Play className="size-3.5 fill-current" /> {isNextMovie ? "Watch Next" : "View Movie"}
                </Link>
              )}

              {movie.id && (
                <WatchlistButton
                  movie={{
                    id: movie.id,
                    title: movie.title,
                    posterPath: movie.posterPath,
                    voteAverage: movie.voteAverage ?? 0,
                    releaseYear: movie.releaseYear,
                  }}
                  showLabel
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
