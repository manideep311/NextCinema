import { Heart, Clock } from "lucide-react";
import { getTrendingMovies, getPopularMovies } from "@/services/tmdb";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { EmptyState } from "@/components/features/dashboard/empty-state";
import { MovieGrid } from "@/components/features/movies/movie-grid";

function toCardMovies(results: Awaited<ReturnType<typeof getTrendingMovies>>["results"]) {
  return results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  }));
}

export default async function DashboardOverview() {
  const [trending, popular] = await Promise.all([
    getTrendingMovies(),
    getPopularMovies(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-muted mb-8">Here's what's happening in movies today.</p>

      <DashboardSection title="Trending This Week">
        <MovieGrid movies={toCardMovies(trending.results.slice(0, 10))} />
      </DashboardSection>

      <DashboardSection title="Popular Picks">
        <MovieGrid movies={toCardMovies(popular.results.slice(0, 10))} />
      </DashboardSection>

      <DashboardSection title="Continue Watching">
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Movies you start exploring will show up here so you can pick back up."
        />
      </DashboardSection>

      <DashboardSection title="Favorites">
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart on any movie to save it here for later."
        />
      </DashboardSection>
    </div>
  );
}
