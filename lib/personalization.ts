// Pure blending of per-favourite recommendation lists into one For You
// ranking. No I/O — services/for-you.ts fetches the lists (each one from
// the shared per-movie cache) and hands them here.

/** How many of the user's most recent favourites seed For You. */
export const MAX_SEEDS = 5;

/** Weight of each seed, newest favourite first: recent taste counts most, older favourites still count. */
export const SEED_WEIGHTS = [1, 0.8, 0.6, 0.4, 0.2] as const;

export interface Seed {
  id: number;
  title: string;
}

export interface SeedRecommendations<T extends { id: number; matchScore: number }> {
  seed: Seed;
  /** That seed's ranked recommendations (each with a 0–100 matchScore). */
  recommendations: T[];
}

export interface BlendedPick<T> {
  /** The candidate as scored against `seed` — its match %, reasons and breakdown are relative to that favourite. */
  movie: T;
  /** The favourite contributing most to this pick ("Because you liked …"). */
  seed: Seed;
  /** Σ seed weight × match score / 100 over every seed list the candidate appears in. */
  blendedScore: number;
}

/**
 * Ranks candidates by Σᵢ wᵢ · scoreᵢ, where wᵢ is the i-th newest seed's
 * weight and scoreᵢ the candidate's match against that seed (0 when it
 * isn't in that seed's list). A movie that fits several favourites rises;
 * a fit with a recent favourite counts more than one with an old one.
 * Seeds must be ordered newest first; anything in `exclude` (favourites,
 * watched) is skipped. Ties: blended score, then best single
 * contribution, then TMDB id — fully deterministic.
 */
export function blendSeedRecommendations<T extends { id: number; matchScore: number }>(
  lists: SeedRecommendations<T>[],
  exclude: ReadonlySet<number>,
  limit: number
): BlendedPick<T>[] {
  const picks = new Map<number, BlendedPick<T> & { bestContribution: number }>();

  lists.slice(0, MAX_SEEDS).forEach(({ seed, recommendations }, index) => {
    const weight = SEED_WEIGHTS[index];
    for (const movie of recommendations) {
      if (exclude.has(movie.id)) continue;
      const contribution = (weight * movie.matchScore) / 100;
      const existing = picks.get(movie.id);
      if (!existing) {
        picks.set(movie.id, { movie, seed, blendedScore: contribution, bestContribution: contribution });
        continue;
      }
      existing.blendedScore += contribution;
      if (contribution > existing.bestContribution) {
        existing.movie = movie;
        existing.seed = seed;
        existing.bestContribution = contribution;
      }
    }
  });

  const precise = (value: number) => Math.round(value * 1e9);
  return [...picks.values()]
    .sort(
      (a, b) =>
        precise(b.blendedScore) - precise(a.blendedScore) ||
        precise(b.bestContribution) - precise(a.bestContribution) ||
        a.movie.id - b.movie.id
    )
    .slice(0, limit)
    .map(({ movie, seed, blendedScore }) => ({ movie, seed, blendedScore }));
}
