import "server-only";
import { unstable_cache } from "next/cache";
import { getMovieWithExtras, getSimilarMovies, TMDB_CACHE } from "@/services/tmdb";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { recommendMovies } from "@/lib/recommendation-engine";
import type { RecommendationReason } from "@/types/movie";
import type { TmdbMovie } from "@/types/tmdb";

/** How many of TMDB's similar movies get fully profiled and scored. */
const MAX_CANDIDATES = 20;
/** Enough for the Recommendations page; other surfaces slice what they need. */
export const MAX_RECOMMENDATIONS = 20;
/** Candidates with fewer votes are noise — rarely a movie anyone would want recommended. */
const MIN_CANDIDATE_VOTES = 10;

/** A scored recommendation, slimmed to what the UI renders (serializable for the cache). */
export interface MovieRecommendation {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
  /** 0–100 normalized similarity to the seed movie (see lib/recommendation-engine.ts). */
  matchScore: number;
  reasons: RecommendationReason[];
}

/**
 * Cheap pre-filter on data TMDB's /similar already returned, applied
 * *before* paying for a full profile request per candidate: drops
 * duplicates, the seed itself, unreleased titles, poster-less entries, and
 * near-zero-vote noise.
 */
export function selectCandidates(seedId: number, similar: TmdbMovie[], today: string): TmdbMovie[] {
  const seen = new Set<number>([seedId]);
  const picked: TmdbMovie[] = [];
  for (const movie of similar) {
    if (seen.has(movie.id)) continue;
    seen.add(movie.id);
    if (!movie.poster_path || movie.adult) continue;
    if (!movie.release_date || movie.release_date > today) continue;
    if (movie.vote_count < MIN_CANDIDATE_VOTES) continue;
    picked.push(movie);
    if (picked.length >= MAX_CANDIDATES) break;
  }
  return picked;
}

async function computeRecommendations(movieId: number): Promise<MovieRecommendation[]> {
  const [baseData, similarPage] = await Promise.all([getMovieWithExtras(movieId), getSimilarMovies(movieId)]);
  const baseProfile = mapExtrasToProfile(baseData);
  const candidates = selectCandidates(movieId, similarPage.results, new Date().toISOString().slice(0, 10));

  // allSettled: a dropped connection or two shrinks the pool instead of failing the whole list.
  const settled = await Promise.allSettled(candidates.map((movie) => getMovieWithExtras(movie.id)));
  const profiles = settled.flatMap((result) => (result.status === "fulfilled" ? [mapExtrasToProfile(result.value)] : []));

  return recommendMovies(baseProfile, profiles, MAX_RECOMMENDATIONS).map(({ movie, score, reasons }) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseYear: movie.releaseYear,
    matchScore: score,
    reasons,
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
export const getRecommendationsForMovie = unstable_cache(computeRecommendations, ["recommendations-for-movie-v2"], {
  revalidate: TMDB_CACHE.movie,
  tags: ["recommendations"],
});
