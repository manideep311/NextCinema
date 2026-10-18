import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { RefreshButton } from "@/components/ui/refresh-button";
import { getForYou } from "@/services/for-you";

/**
 * Personalized picks, rendered on the server and streamed in (wrap in
 * <Suspense fallback={<ForYouSectionSkeleton />}>) — no client-side fetch
 * waterfall. Seeded from the user's five most recent favorites (newest
 * weighted most — lib/personalization.ts); with no favorites
 * yet it shows popular picks *without* a match score, since popularity
 * isn't similarity.
 */
export async function ForYouSection({ userId, limit = 10 }: { userId: string; limit?: number }) {
  const result = await getForYou(userId, limit).catch(() => null);

  // A failed load is an error, not an empty state — don't tell the user to
  // go favorite something when the real problem is on our side.
  if (result === null) {
    return (
      <DashboardSection title="For You">
        <div
          role="alert"
          className="flex flex-col items-center text-center gap-3 py-10 px-5 border border-dashed border-white/10 rounded-lg"
        >
          <p className="text-sm text-muted">Couldn&apos;t load your picks right now. It&apos;s usually temporary.</p>
          <RefreshButton />
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="For You">
      <div className="-mt-2 mb-1 text-sm text-muted">
        {result.basis === "similarity" ? (
          <span>
            {result.basedOn.length === 1 ? "Because you liked " : "Blended from your recent favorites: "}
            <span className="text-text font-medium">{result.basedOn.map((seed) => seed.title).join(", ")}</span>
          </span>
        ) : (
          <span>Favorite a movie to unlock personalized picks</span>
        )}
      </div>

      {result.journey && (
        <Link
          href={`/dashboard/journeys/${result.journey.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
        >
          Continue the {result.journey.shortName} journey <ArrowRight className="size-3.5" />
        </Link>
      )}

      <MovieGrid
        movies={result.movies}
        matchScores={Object.fromEntries(
          result.movies.flatMap((movie) => (movie.matchScore !== null ? [[movie.id, movie.matchScore]] : []))
        )}
        reasons={Object.fromEntries(
          result.movies.flatMap((movie) => (movie.reasons[0] ? [[movie.id, movie.reasons[0].label]] : []))
        )}
        explanations={Object.fromEntries(
          result.movies.flatMap((movie) => (movie.explanation ? [[movie.id, movie.explanation]] : []))
        )}
      />
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
