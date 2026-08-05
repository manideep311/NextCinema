"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";
import { useAuth } from "@/components/providers/auth-provider";
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

  return (
    <DashboardSection title="For You">
      <div className="flex items-center gap-2 -mt-2 mb-4 text-sm text-muted">
        <Sparkles className="size-3.5 text-accent" />
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
