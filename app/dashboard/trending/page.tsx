import type { Metadata } from "next";
import { getTrendingMovies } from "@/services/tmdb";
import { DashboardSection } from "@/components/features/dashboard/dashboard-section";
import { MovieGrid } from "@/components/features/movies/movie-grid";

export const metadata: Metadata = { title: "Trending — NextCinema" };

export default async function TrendingPage() {
  const trending = await getTrendingMovies();
  const movies = trending.results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  }));

  return (
    <div>
      <h1 className="font-serif text-2xl mb-1">Trending</h1>
      <p className="text-muted mb-8">What everyone&apos;s watching this week.</p>
      <DashboardSection title="Trending This Week">
        <MovieGrid movies={movies} />
      </DashboardSection>
    </div>
  );
}
