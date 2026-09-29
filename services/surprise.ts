import "server-only";
import { discoverMovies } from "@/services/tmdb";
import { toCardMovie, type CardMovie } from "@/lib/movie-mapper";
import { isoDate } from "@/lib/journeys/engine";
import { GENRE } from "@/lib/tmdb-genres";

/**
 * The assistant's "Surprise me" pool — genuine hidden gems, matching what
 * the assistant says it found: well-rated (≥ 7.3) feature films with a
 * real but small audience (150–1,500 TMDB votes) and low popularity. The
 * underlying discover pages are cached public data; the random pick
 * happens per request.
 */
const HIDDEN_GEM_MAX_POPULARITY = 40;

export async function getHiddenGemPool(): Promise<CardMovie[]> {
  const base = {
    sort_by: "vote_average.desc",
    "vote_count.gte": "150",
    "vote_count.lte": "1500",
    "vote_average.gte": "7.3",
    "with_runtime.gte": "60",
    without_genres: `${GENRE.documentary},${GENRE.tvMovie}`,
    "primary_release_date.lte": isoDate(Date.now()),
  };
  const pages = await Promise.allSettled([1, 2, 3].map((page) => discoverMovies({ ...base, page: String(page) })));
  const seen = new Set<number>();
  const pool: CardMovie[] = [];
  for (const result of pages) {
    if (result.status !== "fulfilled") continue;
    for (const movie of result.value.results) {
      if (seen.has(movie.id) || !movie.poster_path || movie.popularity > HIDDEN_GEM_MAX_POPULARITY) continue;
      seen.add(movie.id);
      pool.push(toCardMovie(movie));
    }
  }
  if (pool.length === 0 && pages.every((result) => result.status === "rejected")) {
    throw new Error("Hidden gem pool unavailable");
  }
  return pool;
}
