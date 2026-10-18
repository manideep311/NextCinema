import { getMovieDetails } from "@/services/tmdb";
import { getRecommendationsForMovie } from "@/services/recommendations";
import { RecommendationShowcase, type ShowcasePick } from "@/components/features/landing/recommendation-showcase";

/** Fixed seed for the landing-page example: Interstellar (TMDB id 157336). */
const SHOWCASE_SEED_ID = 157336;
const SHOWCASE_SIZE = 12;

/**
 * Server half of the landing example: runs the real recommendation
 * pipeline for the seed (the same cached computation the movie page uses)
 * and hands the results to the client filters. Streamed in via Suspense,
 * so it never holds up the rest of the landing page.
 */
export async function LiveShowcase() {
  const [recommendations, seed] = await Promise.all([
    getRecommendationsForMovie(SHOWCASE_SEED_ID).catch(() => []),
    getMovieDetails(SHOWCASE_SEED_ID).catch(() => null),
  ]);

  const picks: ShowcasePick[] = recommendations.slice(0, SHOWCASE_SIZE).map((movie) => ({
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear,
    genreIds: movie.genreIds,
    matchScore: movie.matchScore,
    reason: movie.reasons[0]?.label ?? null,
  }));

  return (
    <RecommendationShowcase
      seed={seed ? { title: seed.title, year: seed.release_date ? seed.release_date.slice(0, 4) : null } : null}
      picks={picks}
    />
  );
}
