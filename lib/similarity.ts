/**
 * Generic numeric helpers for scoring — no movie-domain knowledge here.
 * (Set-overlap math lives in lib/recommendation-engine.ts, which computes
 * it against a pre-built base set instead of re-creating sets per call.)
 */

/** Clamps a value into [0, 1] — used to normalize popularity/rating into score components. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
