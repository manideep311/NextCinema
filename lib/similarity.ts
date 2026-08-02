/**
 * Generic set-similarity math — no movie-domain knowledge here at all.
 * Kept separate from recommendation-engine.ts so it's independently
 * testable and reusable if we ever score anything other than movies.
 */

/**
 * Jaccard similarity: size of intersection / size of union.
 * Returns 0–1. Case-insensitive for string sets (genre/keyword/cast names).
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));

  const intersection = [...setA].filter((item) => setB.has(item));
  const union = new Set([...setA, ...setB]);

  return intersection.length / union.size;
}

/** Same idea, for numeric IDs (genre IDs) — avoids string-casing entirely. */
export function jaccardSimilarityNumeric(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = [...setA].filter((item) => setB.has(item));
  const union = new Set([...setA, ...setB]);

  return intersection.length / union.size;
}

/** Clamps a value into [0, 1] — used to normalize popularity into a score component. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Returns the actual overlapping items between two string lists (case-insensitive). */
export function sharedItems(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((item) => setB.has(item.toLowerCase()));
}