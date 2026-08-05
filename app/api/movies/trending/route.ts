import { NextResponse } from "next/server";
import { getTrendingMovies } from "@/services/tmdb";

/** Powers the assistant's "What's trending" quick action. */
export async function GET() {
  const data = await getTrendingMovies();
  const movies = data.results.slice(0, 8).map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  }));

  return NextResponse.json({ movies });
}
