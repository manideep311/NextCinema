import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getMoviesByLanguage, getPopularMovies } from "@/services/tmdb";
import { INDUSTRIES, NAMED_INDUSTRY_LANGUAGES } from "@/lib/industries";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { MAX_TMDB_PAGE, pageParamSchema, parseOptionalParam } from "@/lib/validation";
import { otherIndustryTmdbPages } from "@/lib/tmdb-pages";
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
        { movies: dedupeById(data.results).map(toCardMovie), hasMore: page.value < Math.min(data.total_pages, MAX_TMDB_PAGE) },
        { headers: cacheHeaders }
      );
    }

    // "Other": two popularity pages per app page, filtered locally (see otherIndustryTmdbPages).
    const tmdbPages = otherIndustryTmdbPages(page.value);
    if (!tmdbPages) return NextResponse.json({ movies: [], hasMore: false }, { headers: cacheHeaders });

    const [firstPage, secondPage] = tmdbPages;
    const [pageA, pageB] = await Promise.all([getPopularMovies(firstPage), getPopularMovies(secondPage)]);
    const filtered = dedupeById([...pageA.results, ...pageB.results]).filter(
      (movie) => !NAMED_INDUSTRY_LANGUAGES.includes(movie.original_language)
    );
    return NextResponse.json(
      { movies: filtered.map(toCardMovie), hasMore: secondPage < Math.min(pageB.total_pages, MAX_TMDB_PAGE) },
      { headers: cacheHeaders }
    );
  } catch {
    return jsonError(502, "Couldn't load this category right now.");
  }
}
