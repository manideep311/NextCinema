import { MovieGridSkeleton } from "@/components/features/movies/movie-grid";

/** Instant feedback while a dashboard page's server data loads — same skeleton style as the movie grids. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 bg-surface rounded animate-pulse mb-2" />
      <div className="h-4 w-72 bg-surface/70 rounded animate-pulse mb-8" />
      <MovieGridSkeleton />
    </div>
  );
}
