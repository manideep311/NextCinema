import { Clock } from "lucide-react";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { MovieGrid } from "@/components/features/movies/movie-grid";
import type { StoredMovie } from "@/types/storage";

/** Server-rendered from the user's history — no client fetch, no loading flash. */
export function ContinueWatchingSection({ movies }: { movies: StoredMovie[] }) {
  return (
    <DashboardSection title="Continue Watching">
      {movies.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Movies you start exploring will show up here so you can pick back up."
        />
      ) : (
        <MovieGrid movies={movies} />
      )}
    </DashboardSection>
  );
}
