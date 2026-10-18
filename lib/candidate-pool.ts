import type { TmdbMovie } from "@/types/tmdb";

// Pure candidate-pool assembly, shared by the live recommendation service
// and the offline evaluation script (scripts/evaluate-recommendations.ts).

/** How many candidates get fully profiled (one TMDB request each) and scored per seed. */
export const MAX_CANDIDATES = 40;

/**
 * The seed's genres used for the /discover source: the first two, as TMDB
 * lists them, combined with AND (a comma in `with_genres`). Null when the
 * seed has no genres, in which case that source is skipped.
 */
export function seedDiscoverGenres(genreIds: number[]): string | null {
  return genreIds.length > 0 ? genreIds.slice(0, 2).join(",") : null;
}

/**
 * Merges candidate sources into one pool of at most `max` movies.
 *
 * Sources are interleaved round-robin (1st of each, then 2nd of each, ...)
 * so every source is represented even when the cap is hit. The pool drops
 * the seed itself, duplicates (first occurrence wins), adult titles,
 * entries with no poster, and anything unreleased as of `today`
 * (YYYY-MM-DD). There is deliberately no vote-count floor — the engine's
 * Bayesian-adjusted rating handles thinly voted films.
 */
export function buildCandidatePool(seedId: number, sources: TmdbMovie[][], today: string, max: number = MAX_CANDIDATES): TmdbMovie[] {
  const seen = new Set<number>([seedId]);
  const pool: TmdbMovie[] = [];
  const longest = Math.max(0, ...sources.map((source) => source.length));

  for (let index = 0; index < longest && pool.length < max; index++) {
    for (const source of sources) {
      const movie = source[index];
      if (!movie || seen.has(movie.id)) continue;
      seen.add(movie.id);
      if (movie.adult || !movie.poster_path) continue;
      if (!movie.release_date || movie.release_date > today) continue;
      pool.push(movie);
      if (pool.length >= max) break;
    }
  }
  return pool;
}
