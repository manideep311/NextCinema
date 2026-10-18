import "server-only";
import { unstable_cache } from "next/cache";
import { discoverMovies, getMovieRecommendations, getMovieWithExtras, getSimilarMovies, TMDB_CACHE } from "@/services/tmdb";
import { buildCandidatePool, seedDiscoverGenres } from "@/lib/candidate-pool";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { recommendMovies } from "@/lib/recommendation-engine";
import type { RecommendationReason, SignalExplanation } from "@/types/movie";
import type { TmdbMovie, TmdbPaginatedResponse } from "@/types/tmdb";

/** Enough for the Recommendations page; other surfaces slice what they need. */
export const MAX_RECOMMENDATIONS = 20;

/** A scored recommendation, slimmed to what the UI renders (serializable for the cache). */
export interface MovieRecommendation {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  genreIds: number[];
  /** 0–100 normalized similarity to the seed movie (see lib/recommendation-engine.ts). */
  matchScore: number;
  reasons: RecommendationReason[];
  /** Per-signal breakdown of matchScore (the "Why this?" panel). */
  explanation: SignalExplanation[];
}

const NO_RESULTS: TmdbPaginatedResponse<TmdbMovie> = { page: 1, results: [], total_pages: 0, total_results: 0 };

/**
 * Candidate pool for a seed: TMDB /similar (pages 1–2), TMDB
 * /recommendations, and the most-voted /discover results in the seed's top
 * genres — merged round-robin and de-duplicated (lib/candidate-pool.ts).
 * Only /similar page 1 is required; a failed optional source just shrinks
 * the pool.
 */
async function fetchCandidatePool(movieId: number, genreIds: number[]): Promise<TmdbMovie[]> {
  const genres = seedDiscoverGenres(genreIds);
  const [similarFirst, similarSecond, tmdbRecommendations, discovered] = await Promise.all([
    getSimilarMovies(movieId, 1),
    getSimilarMovies(movieId, 2).catch(() => NO_RESULTS),
    getMovieRecommendations(movieId).catch(() => NO_RESULTS),
    genres ? discoverMovies({ with_genres: genres, sort_by: "vote_count.desc" }).catch(() => NO_RESULTS) : NO_RESULTS,
  ]);
  return buildCandidatePool(
    movieId,
    [[...similarFirst.results, ...similarSecond.results], tmdbRecommendations.results, discovered.results],
    new Date().toISOString().slice(0, 10)
  );
}

async function computeRecommendations(movieId: number): Promise<MovieRecommendation[]> {
  const baseData = await getMovieWithExtras(movieId);
  const baseProfile = mapExtrasToProfile(baseData);
  const candidates = await fetchCandidatePool(movieId, baseProfile.genreIds);

  // allSettled: a dropped connection or two shrinks the pool instead of failing the whole list.
  const settled = await Promise.allSettled(candidates.map((movie) => getMovieWithExtras(movie.id)));
  const profiles = settled.flatMap((result) => (result.status === "fulfilled" ? [mapExtrasToProfile(result.value)] : []));

  return recommendMovies(baseProfile, profiles, MAX_RECOMMENDATIONS).map(({ movie, score, reasons, explanation }) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseYear: movie.releaseYear,
    genreIds: movie.genreIds,
    matchScore: score,
    reasons,
    explanation,
  }));
}

/**
 * Ranked, explained recommendations for one movie. This is PUBLIC data —
 * the result for a given movie is the same for every user — so it's cached
 * once per movie and shared by every surface that needs it: the movie
 * page's Similar Movies, the Overview's For You, the Recommendations page,
 * and the assistant. Personalization (which movie to seed from, what to
 * exclude) happens outside this cache in services/for-you.ts.
 */
export const getRecommendationsForMovie = unstable_cache(computeRecommendations, ["recommendations-for-movie-v5"], {
  revalidate: TMDB_CACHE.movie,
  tags: ["recommendations"],
});
