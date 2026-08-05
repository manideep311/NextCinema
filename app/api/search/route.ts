import { NextResponse } from "next/server";
import { searchMovies, getMoviesByGenres } from "@/services/tmdb";
import { detectGenresFromQuery } from "@/lib/mood-lexicon";
import type { TmdbMovie } from "@/types/tmdb";

function toCardMovie(movie: TmdbMovie) {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [], mode: "title" });
  }

  // Mood/genre search takes priority when the query reads like a vibe
  // ("mind-blowing plot twists") rather than a title — a plain title
  // search for that phrase would return nothing useful. Titles that
  // happen to contain a mood word (rare) just fall through to the same
  // title search everything else uses.
  const genreIds = detectGenresFromQuery(query);

  if (genreIds.length > 0) {
    const data = await getMoviesByGenres(genreIds);
    return NextResponse.json({ results: data.results.map(toCardMovie), mode: "mood" });
  }

  const data = await searchMovies(query);
  return NextResponse.json({ results: data.results.map(toCardMovie), mode: "title" });
}
