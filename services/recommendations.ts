import "server-only";
import { getMovieWithExtras, getSimilarMovies } from "@/services/tmdb";
import { mapExtrasToProfile } from "@/lib/movie-mapper";
import { recommendMovies } from "@/lib/recommendation-engine";
import type { ScoredMovie } from "@/types/movie";

/** Cap on how many similar-movie candidates we fully profile and score.
 *  TMDB's /similar endpoint already pre-filters reasonably well, so we
 *  don't need to score hundreds of movies — this keeps request count
 *  and response time sane. */
const MAX_CANDIDATES = 20;

/**
 * Full pipeline: given a movie the user is viewing/liked, fetch that
 * movie's full profile plus a candidate pool from TMDB's own "similar"
 * endpoint, profile each candidate the same way, then re-rank the whole
 * pool using our own scoring engine (so "why we recommended this" reasons
 * are always available — TMDB's /similar gives no explanation of its own).
 */
export async function getRecommendationsForMovie(
  movieId: number,
  topN = 10
): Promise<ScoredMovie[]> {
  const [baseData, similarPage] = await Promise.all([
    getMovieWithExtras(movieId),
    getSimilarMovies(movieId),
  ]);

  const baseProfile = mapExtrasToProfile(baseData);

  const candidateProfiles = await Promise.all(
    similarPage.results
      .slice(0, MAX_CANDIDATES)
      .map((movie) => getMovieWithExtras(movie.id).then(mapExtrasToProfile))
  );

  return recommendMovies(baseProfile, candidateProfiles, topN);
}