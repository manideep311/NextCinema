import { getTrendingMovies, getPopularMovies, getTopRatedMovies, getUpcomingMovies } from "@/services/tmdb";
import { getSession } from "@/lib/auth/session";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid } from "@/components/features/movies/movie-grid";
import { ForYouSection } from "@/components/features/dashboard/for-you-section";
import { ContinueWatchingSection } from "@/components/features/dashboard/continue-watching-section";
import { FavoritesSection } from "@/components/features/dashboard/favorites-section";
import { WatchlistSection } from "@/components/features/dashboard/watchlist-section";

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
  const [session, trending, popular, topRated, upcoming] = await Promise.all([
    getSession(),
    getTrendingMovies(),
    getPopularMovies(),
    getTopRatedMovies(),
    getUpcomingMovies(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-1">
        {session ? `Welcome back, ${session.name.split(" ")[0]}` : "Welcome back"}
      </h1>
      <p className="text-muted mb-6">Here&apos;s what&apos;s happening in movies today.</p>

      {session && (
        <>
          <ForYouSection />
          <ContinueWatchingSection limit={10} />
        </>
      )}

      <DashboardSection title="Trending This Week">
        <MovieGrid movies={toCardMovies(trending.results.slice(0, 10))} />
      </DashboardSection>

      <DashboardSection title="Popular Picks">
        <MovieGrid movies={toCardMovies(popular.results.slice(0, 10))} />
      </DashboardSection>

      <DashboardSection title="Highly Rated">
        <MovieGrid movies={toCardMovies(topRated.results.slice(0, 10))} />
      </DashboardSection>

      <DashboardSection title="Upcoming">
        <MovieGrid movies={toCardMovies(upcoming.results.slice(0, 10))} />
      </DashboardSection>

      {session && (
        <>
          <FavoritesSection limit={10} />
          <WatchlistSection limit={10} />
        </>
      )}
    </div>
  );
}
