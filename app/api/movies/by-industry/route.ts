import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getMoviesByLanguage, getPopularMovies } from "@/services/tmdb";
import { INDUSTRIES, NAMED_INDUSTRY_LANGUAGES } from "@/lib/industries";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { pageParamSchema, parseOptionalParam } from "@/lib/validation";
import { toCardMovie } from "@/lib/movie-mapper";
import type { TmdbMovie } from "@/types/tmdb";

const industrySchema = z.enum(INDUSTRIES.map((industry) => industry.id) as [string, ...string[]]);

/** TMDB can return the same movie across two nearby "popular" pages if the list reshuffles — dedupe by id. */
function dedupeById(movies: TmdbMovie[]): TmdbMovie[] {
  return [...new Map(movies.map((movie) => [movie.id, movie])).values()];
}

/** Categories page + Poster Puzzle pools. Public data; industry and page are validated. */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "tmdb-proxy");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const industry = parseOptionalParam(params.get("industry"), industrySchema, "tollywood");
  if (!industry.ok) return jsonError(400, "Unknown industry.");
  const page = parseOptionalParam(params.get("page"), pageParamSchema, 1);
  if (!page.ok) return jsonError(400, page.error);

  const config = INDUSTRIES.find((entry) => entry.id === industry.value)!;
  const cacheHeaders = { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" };

  try {
    if (config.language) {
      const data = await getMoviesByLanguage(config.language, page.value);
      return NextResponse.json(
        { movies: dedupeById(data.results).map(toCardMovie), hasMore: page.value < Math.min(data.total_pages, 500) },
        { headers: cacheHeaders }
      );
    }

    // "Other": TMDB's discover can't filter "language NOT IN (...)", so pull
    // two popularity pages and filter locally.
    const [pageA, pageB] = await Promise.all([getPopularMovies(page.value * 2 - 1), getPopularMovies(page.value * 2)]);
    const filtered = dedupeById([...pageA.results, ...pageB.results]).filter(
      (movie) => !NAMED_INDUSTRY_LANGUAGES.includes(movie.original_language)
    );
    return NextResponse.json(
      { movies: filtered.map(toCardMovie), hasMore: page.value * 2 < Math.min(pageB.total_pages, 500) },
      { headers: cacheHeaders }
    );
  } catch {
    return jsonError(502, "Couldn't load this category right now.");
  }
}
