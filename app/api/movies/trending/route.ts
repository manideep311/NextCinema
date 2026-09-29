import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit, jsonError } from "@/lib/http";
import { getTrendingMovies } from "@/services/tmdb";
import { toCardMovie } from "@/lib/movie-mapper";

/** Powers the assistant's "What's trending" action and the Poster Puzzle's Trending pool. Public data. */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "tmdb-proxy");
  if (limited) return limited;

  try {
    const data = await getTrendingMovies();
    return NextResponse.json(
      { movies: data.results.slice(0, 8).map(toCardMovie) },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
    );
  } catch {
    return jsonError(502, "Couldn't load trending movies right now.");
  }
}
