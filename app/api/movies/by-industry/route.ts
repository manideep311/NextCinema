import { NextResponse } from "next/server";
import { getMoviesByLanguage, getPopularMovies } from "@/services/tmdb";
import { INDUSTRIES, NAMED_INDUSTRY_LANGUAGES, type IndustryId } from "@/lib/industries";
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

/** TMDB can return the same movie across two nearby "popular" pages if the
 *  list reshuffles between requests — dedupe by id before it ever reaches
 *  a keyed React list. */
function dedupeById(movies: TmdbMovie[]): TmdbMovie[] {
  return [...new Map(movies.map((movie) => [movie.id, movie])).values()];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const industry = (searchParams.get("industry") ?? "tollywood") as IndustryId;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const config = INDUSTRIES.find((i) => i.id === industry);
  if (!config) {
    return NextResponse.json({ error: "Unknown industry" }, { status: 400 });
  }

  if (config.language) {
    const data = await getMoviesByLanguage(config.language, page);
    return NextResponse.json({
      movies: dedupeById(data.results).map(toCardMovie),
      hasMore: page < data.total_pages,
    });
  }

  // "Other": TMDB's discover endpoint can't filter to "language NOT IN
  // (...)", so pull a couple of popularity pages and filter client-side.
  const [pageA, pageB] = await Promise.all([getPopularMovies(page * 2 - 1), getPopularMovies(page * 2)]);
  const filtered = dedupeById([...pageA.results, ...pageB.results]).filter(
    (movie) => !NAMED_INDUSTRY_LANGUAGES.includes(movie.original_language)
  );

  return NextResponse.json({
    movies: filtered.map(toCardMovie),
    hasMore: page * 2 < pageB.total_pages,
  });
}
