"use client";

import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";

export function WatchlistSection({ limit }: { limit?: number }) {
  const { watchlist, isHydrated } = useWatchlist();
  const shown = limit ? watchlist.slice(0, limit) : watchlist;

  return (
    <DashboardSection title="Watchlist">
      {!isHydrated ? (
        <MovieGridSkeleton count={limit ?? 5} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Your watchlist is empty"
          description="Bookmark movies you want to watch later and they'll show up here."
        />
      ) : (
        <MovieGrid movies={shown} />
      )}
    </DashboardSection>
  );
}
