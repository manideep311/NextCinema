import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { getForYou } from "@/services/for-you";

/**
 * Personalized picks, rendered on the server and streamed in (wrap in
 * <Suspense fallback={<ForYouSectionSkeleton />}>) — no client-side fetch
 * waterfall. Seeded from the user's latest favorite; with no favorites
 * yet it shows popular picks *without* a match score, since popularity
 * isn't similarity.
 */
export async function ForYouSection({ userId, limit = 10 }: { userId: string; limit?: number }) {
  const result = await getForYou(userId, limit).catch(() => null);

  return (
    <DashboardSection title="For You">
      <div className="-mt-2 mb-1 text-sm text-muted">
        {result?.basis === "similarity" ? (
          <span>
            Because you liked <span className="text-text font-medium">{result.basedOn.title}</span>
          </span>
        ) : (
          <span>Favorite a movie to unlock personalized picks</span>
        )}
      </div>

      {result?.journey && (
        <Link
          href={`/dashboard/journeys/${result.journey.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
        >
          Continue the {result.journey.shortName} journey <ArrowRight className="size-3.5" />
        </Link>
      )}

      {result === null ? (
        <div className="flex items-center gap-3 text-sm text-muted py-6 border border-dashed border-white/10 rounded-lg px-5">
          Couldn&apos;t load your picks right now.
        </div>
      ) : (
        <MovieGrid
          movies={result.movies}
          matchScores={Object.fromEntries(
            result.movies.flatMap((movie) => (movie.matchScore !== null ? [[movie.id, movie.matchScore]] : []))
          )}
          reasons={Object.fromEntries(
            result.movies.flatMap((movie) => (movie.reasons[0] ? [[movie.id, movie.reasons[0].label]] : []))
          )}
        />
      )}
    </DashboardSection>
  );
}

/** Same heading + grid skeleton the section always showed while loading. */
export function ForYouSectionSkeleton({ count = 10 }: { count?: number }) {
  return (
    <DashboardSection title="For You">
      <div className="-mt-2 mb-1 text-sm text-muted">&nbsp;</div>
      <MovieGridSkeleton count={count} />
    </DashboardSection>
  );
}
