"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { MovieGrid, MovieGridSkeleton } from "@/components/features/movies/movie-grid";

export function FavoritesSection({ limit }: { limit?: number }) {
  const { favorites, isHydrated } = useFavorites();
  const shown = limit ? favorites.slice(0, limit) : favorites;

  return (
    <DashboardSection title="Favorites">
      {!isHydrated ? (
        <MovieGridSkeleton count={limit ?? 5} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart on any movie to save it here for later."
        />
      ) : (
        <MovieGrid movies={shown} />
      )}
    </DashboardSection>
  );
}
