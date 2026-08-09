import { DURATION, EASE_OUT } from "@/components/motion/motion-config";

/**
 * Stable id shared between every MovieCard poster (dashboard, trending,
 * categories, search, recommendations, favorites, watchlist, recent,
 * similar movies — MovieCard is reused everywhere) and the MovieHero
 * poster for that same movie. Matching `layoutId`s are what let Framer
 * Motion bridge the poster across the /dashboard/movie/[id] route change
 * as one continuous shared-element transition instead of a plain cut —
 * NextCinema's signature interaction.
 *
 * If a card with this id isn't mounted when the detail page appears (e.g.
 * a direct link, or the source card was off-screen/unmounted), Framer
 * simply has nothing to FLIP from and the hero's own fallback
 * initial/animate fade takes over — no error, no special-casing needed.
 */
export function moviePosterLayoutId(movieId: number | string): string {
  return `movie-poster-${movieId}`;
}

/** Shared timing for the poster FLIP — hero-weight (this is the app's
 *  biggest transition), but still a restrained easeOut, not a spring. */
export const POSTER_TRANSITION = { duration: DURATION.hero, ease: EASE_OUT };
