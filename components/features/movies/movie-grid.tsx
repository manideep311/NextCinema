import type { MovieProfile } from "@/types/movie";
import { MovieCard } from "@/components/features/movies/movie-card";
import { MovieCardSkeleton } from "@/components/features/movies/movie-card-skeleton";

interface MovieGridProps {
  movies: Pick<MovieProfile, "id" | "title" | "posterPath" | "voteAverage" | "releaseYear">[];
  matchScores?: Record<number, number>;
}

/** Reusable responsive grid — every dashboard section and future search/
 *  recommendation page renders its movies through this, so the grid
 *  breakpoints only ever need to be tuned in one place. */
export function MovieGrid({ movies, matchScores }: MovieGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} matchScore={matchScores?.[movie.id]} />
      ))}
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
