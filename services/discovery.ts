import "server-only";
import { getMoviesByLanguage, getTopRatedByLanguage, getNewReleasesByLanguage } from "@/services/tmdb";
import type { TmdbMovie } from "@/types/tmdb";
// Types (and the one shared constant) live in types/discovery.ts — a plain
// module with no "server-only" import — specifically so client components
// can import them without pulling this server-only service, and its
// "server-only" chain, into the browser bundle. Import `type`-only here;
// never re-export a value from this file for client use.
import type { DiscoveryMovie, IndustryCollections } from "@/types/discovery";

const COLLECTION_SIZE = 12;

// TMDB ratings from a handful of votes are noise, not signal — nothing
// below this vote count is ever treated as "top rated" or a "hidden gem",
// regardless of how high its raw average looks.
const MIN_RELIABLE_VOTES = 40;

// Popularity bands used to separate "genuinely under-discovered" from
// "moderately well-known" — TMDB's own `popularity` score for a real
// blockbuster typically runs into the hundreds; a smaller, well-reviewed
// title usually sits well under this. This is a documented heuristic
// (TMDB has no direct "obscurity" field), not an exact measurement.
const HIDDEN_GEM_MAX_POPULARITY = 40;
const UNDER_RADAR_MAX_POPULARITY = 150;

function toDiscoveryMovie(movie: TmdbMovie): DiscoveryMovie {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  };
}

function dedupeById(movies: TmdbMovie[]): TmdbMovie[] {
  return [...new Map(movies.map((movie) => [movie.id, movie])).values()];
}

/**
 * Fetches everything needed for one industry's Overview collections in
 * parallel, then derives all five from that shared data — the popularity
 * pool and the rating pool are each fetched once and reused across
 * multiple collections, never re-fetched per section. Each of the three
 * underlying TMDB calls fails independently (`Promise.allSettled`): a
 * dropped connection for one never takes the others down with it.
 */
export async function getIndustryCollections(languageCode: string): Promise<IndustryCollections> {
  const [popularSettled, ratedSettled, newSettled] = await Promise.allSettled([
    Promise.all([getMoviesByLanguage(languageCode, 1), getMoviesByLanguage(languageCode, 2)]),
    Promise.all([getTopRatedByLanguage(languageCode, 1), getTopRatedByLanguage(languageCode, 2)]),
    getNewReleasesByLanguage(languageCode, 1),
  ]);

  const popularPool =
    popularSettled.status === "fulfilled" ? dedupeById(popularSettled.value.flatMap((p) => p.results)) : null;
  const ratedPool =
    ratedSettled.status === "fulfilled" ? dedupeById(ratedSettled.value.flatMap((p) => p.results)) : null;
  const newPool = newSettled.status === "fulfilled" ? dedupeById(newSettled.value.results) : null;

  // Claims movies for earlier (higher-priority) collections first, so a
  // title that would qualify for both e.g. Top Rated and Hidden Gems only
  // ever appears in the stronger match — later collections pull from
  // whatever's left rather than repeating the same posters everywhere.
  const used = new Set<number>();
  function take(pool: TmdbMovie[], count: number): TmdbMovie[] {
    const picked: TmdbMovie[] = [];
    for (const movie of pool) {
      if (used.has(movie.id)) continue;
      picked.push(movie);
      if (picked.length >= count) break;
    }
    picked.forEach((movie) => used.add(movie.id));
    return picked;
  }

  // "What's getting attention right now" — TMDB's own popularity ranking,
  // scoped to this industry's language. This industry-filtered pool is
  // used instead of the global /api/movies/trending endpoint, which has
  // no language filter at all and would otherwise silently mix in
  // unrelated industries under whichever one the user selected.
  const trending = popularPool ? take(popularPool, COLLECTION_SIZE) : null;

  // Highest-rated, with the reliability floor above — the objective "best
  // reviewed" list.
  const topRated = ratedPool
    ? take(
        ratedPool.filter((movie) => movie.vote_count >= MIN_RELIABLE_VOTES),
        COLLECTION_SIZE
      )
    : null;

  // High quality (same reliability floor as Top Rated) but not among the
  // most popular — genuinely under-discovered rather than "obscure and
  // unreliable".
  const hiddenGems = ratedPool
    ? take(
        ratedPool
          .filter((movie) => movie.vote_count >= MIN_RELIABLE_VOTES && movie.popularity <= HIDDEN_GEM_MAX_POPULARITY)
          .sort((a, b) => b.vote_average - a.vote_average),
        COLLECTION_SIZE
      )
    : null;

  // A wider, more moderate popularity band than Hidden Gems — good movies
  // that are known but not blockbuster-level attention-getting. Deliberately
  // a distinct selection window, not a re-ranking of the same pool.
  const underTheRadar = ratedPool
    ? take(
        ratedPool
          .filter(
            (movie) =>
              movie.vote_count >= MIN_RELIABLE_VOTES &&
              movie.popularity > HIDDEN_GEM_MAX_POPULARITY &&
              movie.popularity <= UNDER_RADAR_MAX_POPULARITY
          )
          .sort((a, b) => b.vote_average - a.vote_average),
        COLLECTION_SIZE
      )
    : null;

  // Newest release dates first, already bounded to already-released titles
  // by getNewReleasesByLanguage — never fabricated/estimated.
  const newReleases = newPool ? take(newPool, COLLECTION_SIZE) : null;

  return {
    trending: trending ? trending.map(toDiscoveryMovie) : null,
    topRated: topRated ? topRated.map(toDiscoveryMovie) : null,
    hiddenGems: hiddenGems ? hiddenGems.map(toDiscoveryMovie) : null,
    underTheRadar: underTheRadar ? underTheRadar.map(toDiscoveryMovie) : null,
    newReleases: newReleases ? newReleases.map(toDiscoveryMovie) : null,
  };
}
