"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import type { MovieProfile } from "@/types/movie";
import { FavoriteButton } from "@/components/features/movies/favorite-button";
import { WatchlistButton } from "@/components/features/movies/watchlist-button";
import { moviePosterLayoutId, POSTER_TRANSITION } from "@/components/motion/movie-poster-transition";

interface MovieCardProps {
  movie: Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">;
  matchScore?: number;
  /** Optional one-line "why it fits" explanation — shown on hover when
   *  present (SimilarMovies / For You already have this from the
   *  recommendation engine; plain grids like Trending don't, and that's fine). */
  reason?: string;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/**
 * Poster-forward movie card — the image is the card. Title and match score
 * sit in a permanent gradient scrim at the bottom for legibility; the
 * "why it fits" reason and a touch more contrast fade in on hover. Kept
 * intentionally quiet: no big rounded container, no heavy chrome.
 *
 * The poster image sits in its own layoutId'd element — see
 * components/motion/movie-poster-transition.tsx — so clicking through to
 * the movie page animates as one continuous poster, not a page cut.
 * Hover/tap feedback stays on CSS transforms (cheap, GPU-friendly);
 * Framer is reserved for the one thing CSS can't do, the cross-page FLIP.
 */
export function MovieCard({ movie, matchScore, reason }: MovieCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Link href={`/dashboard/movie/${movie.id}`} className="block group/card">
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface ring-1 ring-white/[0.06] transition-shadow duration-200 group-hover/card:shadow-lg group-hover/card:shadow-black/30"
      >
        {movie.posterPath ? (
          <>
            <motion.div
              layoutId={reducedMotion ? undefined : moviePosterLayoutId(movie.id)}
              transition={POSTER_TRANSITION}
              className="absolute inset-0 overflow-hidden"
            >
              <Image
                src={`${IMAGE_BASE_URL}/w342${movie.posterPath}`}
                alt={movie.title}
                fill
                sizes="(max-width: 768px) 45vw, 200px"
                className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.04]"
              />
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

            <div className="absolute top-2 left-2 flex flex-col gap-1.5 opacity-80 group-hover/card:opacity-100 transition-opacity duration-200">
              <FavoriteButton movie={movie} />
              <WatchlistButton movie={movie} />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3">
              {matchScore !== undefined && (
                <p className="text-[11px] font-medium text-primary mb-0.5">{matchScore}% Match</p>
              )}
              <h3 className="text-sm font-medium leading-snug text-text truncate">{movie.title}</h3>

              <div className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 mt-1">
                {reason ? (
                  <p className="text-xs text-muted leading-snug line-clamp-2">{reason}</p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{movie.releaseYear ?? "—"}</span>
                    <span className="flex items-center gap-1">
                      <Star className="size-3 fill-current text-primary/80" />
                      {movie.voteAverage.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs px-4 text-center">
            No poster available
          </div>
        )}
      </motion.div>
    </Link>
  );
}
