"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { useAuth } from "@/components/providers/auth-provider";
import { findJourneyByTitle } from "@/lib/journeys/definitions";
import type { MovieProfile } from "@/types/movie";

interface ForYouMovie extends Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear"> {
  matchScore: number;
}

/**
 * Personalized picks. Seeded server-side from the user's most recent
 * favorite when signed in (real personalization); shows a popularity-
 * ranked fallback with a "sign in to personalize" nudge otherwise.
 */
export function ForYouSection({ limit = 10 }: { limit?: number }) {
  const { user } = useAuth();
  const [movies, setMovies] = useState<ForYouMovie[] | null>(null);
  const [basedOnTitle, setBasedOnTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/recommendations/for-you", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMovies((data.movies ?? []).slice(0, limit));
        setBasedOnTitle(data.basedOnTitle ?? null);
      })
      .catch(() => !cancelled && setMovies([]));
    return () => {
      cancelled = true;
    };
  }, [limit]);

  // Pure title match, no I/O — if the movie this row is based on happens
  // to belong to a known journey, offer a direct path into it alongside
  // (not instead of) the normal recommendations below.
  const journeyMatch = useMemo(() => (basedOnTitle ? findJourneyByTitle(basedOnTitle) : undefined), [basedOnTitle]);

  return (
    <DashboardSection title="For You">
      <div className="-mt-2 mb-1 text-sm text-muted">
        {basedOnTitle ? (
          <span>
            Because you liked <span className="text-text font-medium">{basedOnTitle}</span>
          </span>
        ) : user ? (
          <span>Favorite a movie to unlock personalized picks</span>
        ) : (
          <span>
            <Link href="/signup" className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to personalize these picks
          </span>
        )}
      </div>

      {journeyMatch && (
        <Link
          href={`/dashboard/journeys/${journeyMatch.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
        >
          Continue the {journeyMatch.shortName} journey <ArrowRight className="size-3.5" />
        </Link>
      )}

      {movies === null ? (
        <MovieGridSkeleton />
      ) : (
        <MovieGrid
          movies={movies}
          matchScores={Object.fromEntries(movies.map((m) => [m.id, m.matchScore]))}
        />
      )}
    </DashboardSection>
  );
}
