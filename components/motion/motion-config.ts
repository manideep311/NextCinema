/**
 * Shared motion vocabulary for NextCinema. Every custom transition in the
 * app should pull its durations/easing from here rather than inventing new
 * numbers inline — that's what keeps the motion language feeling like one
 * coherent edit rather than a pile of unrelated animations.
 *
 * Timing bands (seconds), per the app's motion direction:
 *   micro   — button/icon feedback            120–180ms
 *   card    — hover/card-level interactions    180–250ms
 *   page    — page/section transitions         250–400ms
 *   hero    — hero/large reveals                400–650ms
 */
export const DURATION = {
  micro: 0.15,
  card: 0.22,
  page: 0.3,
  hero: 0.5,
} as const;

// A quick-start, soft-settle curve — reads like a film edit/cut easing
// into place rather than a spring bouncing to rest. Used for anything
// entering the screen.
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Symmetric, restrained ease for things that move both in and out (page
// crossfades, tab switches) — deliberately not a bounce/spring curve.
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Standard modal/dialog entrance — used by the command palette, Poster
 *  Puzzle, and the companion panel so every overlay in the app opens the
 *  same way. */
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export const modalTransition = { duration: DURATION.card, ease: EASE_OUT };

/** A gentle default for staggered children (movie grids, quick actions) — 40–60ms apart, per the motion spec. */
export function staggerContainer(staggerMs = 50, delayMs = 0) {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerMs / 1000, delayChildren: delayMs / 1000 },
    },
  };
}
