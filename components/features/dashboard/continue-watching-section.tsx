"use client";

import { Clock } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";

export function ContinueWatchingSection({ limit }: { limit?: number }) {
  const { recentlyViewed, isHydrated } = useRecentlyViewed();
  const shown = limit ? recentlyViewed.slice(0, limit) : recentlyViewed;

  return (
    <DashboardSection title="Continue Watching">
      {!isHydrated ? (
        <MovieGridSkeleton count={limit ?? 5} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Movies you start exploring will show up here so you can pick back up."
        />
      ) : (
        <MovieGrid movies={shown} />
      )}
    </DashboardSection>
  );
}
