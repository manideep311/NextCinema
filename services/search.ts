import "server-only";
import { unstable_cache } from "next/cache";
import { discoverMovies, getPersonMovieCredits, searchMovies, searchPeople, TMDB_CACHE, type DiscoverParams } from "@/services/tmdb";
import { getRecommendationsForMovie } from "@/services/recommendations";
import { searchJourneys } from "@/services/journeys";
import { describeIntent, hasDiscoverIntent, interpretQuery, type SearchIntent } from "@/lib/search/interpret";
import { normalizeText } from "@/lib/journeys/definitions";
import { bayesianRating, isoDate } from "@/lib/journeys/engine";
import { toCardMovie, type CardMovie } from "@/lib/movie-mapper";
import { GENRE } from "@/lib/tmdb-genres";
import type { JourneySearchResult } from "@/types/journey";
import type { TmdbMovie, TmdbPerson } from "@/types/tmdb";

export type SearchMode = "title" | "mood" | "discover" | "similar" | "person";

export interface SearchResponse {
  results: CardMovie[];
  mode: SearchMode;
  /** What the query was understood as — shown above results for anything but a plain title search. */
  label: string | null;
  journeys: JourneySearchResult[];
}

const MAX_RESULTS = 20;
/** The label the UI has always shown for mood/genre matches. */
const MOOD_LABEL = "Matched by mood/genre, ranked by rating";

function matchesGroups(movie: TmdbMovie, groups: number[][]): boolean {
  const genres = new Set(movie.genre_ids ?? []);
  return groups.every((group) => group.some((genre) => genres.has(genre)));
}

function withinYears(movie: { release_date?: string }, intent: SearchIntent): boolean {
  if (!intent.yearRange) return true;
  const year = Number(movie.release_date?.slice(0, 4));
  if (!year) return false;
  return (intent.yearRange.from === undefined || year >= intent.yearRange.from) &&
    (intent.yearRange.to === undefined || year <= intent.yearRange.to);
}

function dedupe(movies: TmdbMovie[]): TmdbMovie[] {
  return [...new Map(movies.filter((movie) => !movie.adult).map((movie) => [movie.id, movie])).values()];
}

/** Exact title match (ignoring case/punctuation and an optional trailing year) — a title always beats an interpretation. */
function findExactTitle(query: string, results: TmdbMovie[]): boolean {
  // Leading articles are ignored, so "dark knight" still finds "The Dark Knight".
  const key = (value: string) => normalizeText(value).replace(/^(the|a|an) /, "");
  const normalized = key(query);
  const withoutYear = normalized.replace(/\s(19|20)\d{2}$/, "");
  return results.some((movie) => {
    const title = key(movie.title);
    return title === normalized || title === withoutYear;
  });
}

async function runDiscover(intent: SearchIntent): Promise<CardMovie[]> {
  const today = isoDate(Date.now());
  const params: DiscoverParams = { "primary_release_date.lte": today };

  // Single-genre groups can be expressed to TMDB as an AND; mixed OR/AND
  // groups are fetched as a broad OR and narrowed locally.
  const groups = intent.genreGroups;
  if (groups.length > 0) {
    params.with_genres = groups.every((group) => group.length === 1)
      ? groups.map((group) => group[0]).join(",")
      : [...new Set(groups.flat())].join("|");
  }
  // Documentaries and TV movies only when asked for — otherwise they crowd out feature films.
  const excluded = [...intent.excludeGenres, GENRE.tvMovie];
  if (!groups.some((group) => group.includes(GENRE.documentary))) excluded.push(GENRE.documentary);
  params.without_genres = excluded.join(",");

  if (intent.yearRange?.from !== undefined) params["primary_release_date.gte"] = `${intent.yearRange.from}-01-01`;
  if (intent.yearRange?.to !== undefined) {
    const end = `${intent.yearRange.to}-12-31`;
    params["primary_release_date.lte"] = end < today ? end : today;
  }
  if (intent.language?.code) params.with_original_language = intent.language.code;
  if (intent.language?.originCountry) params.with_origin_country = intent.language.originCountry;

  // Vote floors keep results recognizable; regional-language queries get a
  // lower floor because those films have fewer TMDB votes overall.
  const regional = Boolean(intent.language && intent.language.code !== "en");
  if (intent.quality === "acclaimed") {
    Object.assign(params, { "vote_count.gte": regional ? "100" : "1000", "vote_average.gte": "7.5", sort_by: "vote_average.desc" });
  } else if (intent.quality === "hidden-gem") {
    Object.assign(params, { "vote_count.gte": regional ? "15" : "80", "vote_count.lte": "2000", "vote_average.gte": "6.8", sort_by: "vote_average.desc" });
  } else if (groups.length > 0) {
    Object.assign(params, { "vote_count.gte": regional ? "20" : "500", sort_by: "vote_average.desc" });
  } else {
    Object.assign(params, { "vote_count.gte": regional ? "5" : "50", sort_by: "popularity.desc" });
  }

  const pages = await Promise.all([1, 2].map((page) => discoverMovies({ ...params, page: String(page) })));
  const matching = dedupe(pages.flatMap((page) => page.results))
    .filter((movie) => matchesGroups(movie, groups) && withinYears(movie, intent))
    .filter((movie) => !(movie.genre_ids ?? []).some((genre) => excluded.includes(genre)))
    .filter((movie) => !intent.language?.code || movie.original_language === intent.language.code);

  // "Ranked by rating" uses a Bayesian rating, so a 9.0 from 500 votes doesn't
  // outrank an 8.6 from 30,000 — results stay recognizable. Popularity-sorted
  // queries keep TMDB's order.
  if (params.sort_by === "vote_average.desc") {
    const prior = regional ? 50 : 2000;
    matching.sort(
      (a, b) =>
        bayesianRating(b.vote_average, b.vote_count, prior) - bayesianRating(a.vote_average, a.vote_count, prior) ||
        a.id - b.id
    );
  }
  return matching.slice(0, MAX_RESULTS).map(toCardMovie);
}

async function runSimilar(title: string): Promise<{ results: CardMovie[]; label: string } | null> {
  const { results } = await searchMovies(title);
  const target = normalizeText(title);
  const seed =
    results.find((movie) => normalizeText(movie.title) === target && movie.vote_count >= 20) ??
    results.find((movie) => movie.vote_count >= 50);
  if (!seed) return null;

  const recommendations = await getRecommendationsForMovie(seed.id);
  if (recommendations.length === 0) return null;
  const year = seed.release_date?.slice(0, 4);
  return {
    results: recommendations.slice(0, MAX_RESULTS).map(({ id, title: t, posterPath, voteAverage, releaseYear }) => ({
      id, title: t, posterPath, voteAverage, releaseYear,
    })),
    label: `Similar to ${seed.title}${year ? ` (${year})` : ""}`,
  };
}

function pickPerson(people: TmdbPerson[], name: string, strict: boolean): TmdbPerson | null {
  const target = normalizeText(name);
  const exact = people.filter((person) => normalizeText(person.name) === target).sort((a, b) => b.popularity - a.popularity)[0];
  if (exact && (!strict || exact.popularity >= 2)) return exact;
  // Single surname ("nolan films"): accept only a clearly well-known match.
  if (!target.includes(" ")) {
    const surname = people.find(
      (person) => normalizeText(person.name).split(" ").at(-1) === target && person.popularity >= 5
    );
    if (surname) return surname;
  }
  return null;
}

async function runPerson(
  name: string,
  role: "cast" | "director" | "auto",
  intent: SearchIntent,
  strict: boolean
): Promise<{ results: CardMovie[]; label: string } | null> {
  const { results: people } = await searchPeople(name);
  const person = pickPerson(people, name, strict);
  if (!person) return null;

  const resolvedRole = role === "auto" ? (person.known_for_department === "Directing" ? "director" : "cast") : role;
  const credits = await getPersonMovieCredits(person.id);
  const films: TmdbMovie[] =
    resolvedRole === "director"
      ? credits.crew.filter((credit) => credit.job === "Director")
      : credits.cast.filter((credit) => credit.order <= 10);

  const today = isoDate(Date.now());
  const results = dedupe(films)
    .filter((movie) => movie.release_date && movie.release_date <= today && movie.vote_count >= 5)
    .filter((movie) => matchesGroups(movie, intent.genreGroups) && withinYears(movie, intent))
    .sort((a, b) => b.popularity - a.popularity || a.id - b.id)
    .slice(0, MAX_RESULTS)
    .map(toCardMovie);
  if (results.length === 0) return null;

  return { results, label: resolvedRole === "director" ? `Directed by ${person.name}` : `Starring ${person.name}` };
}

async function computeSearch(query: string): Promise<SearchResponse> {
  const intent = interpretQuery(query);
  const [titleSearch, journeys] = await Promise.all([
    searchMovies(query),
    searchJourneys(query).catch(() => [] as JourneySearchResult[]),
  ]);
  const titleResults = dedupe(titleSearch.results);
  const titleResponse: SearchResponse = {
    results: titleResults.slice(0, MAX_RESULTS).map(toCardMovie),
    mode: "title",
    label: null,
    journeys,
  };

  // A real title always wins over an interpretation ("Love Actually", "Scary Movie", "1917").
  if (findExactTitle(query, titleResults)) return titleResponse;

  try {
    if (intent.similarTo) {
      const similar = await runSimilar(intent.similarTo);
      if (similar) return { ...similar, mode: "similar", journeys };
    } else if (intent.person) {
      const person = await runPerson(intent.person.name, intent.person.role, intent, false);
      if (person) return { ...person, mode: "person", journeys };
    } else if (hasDiscoverIntent(intent)) {
      const results = await runDiscover(intent);
      if (results.length > 0) {
        const genresOnly = !intent.language && !intent.quality && !intent.yearRange;
        return { results, mode: genresOnly ? "mood" : "discover", label: genresOnly ? MOOD_LABEL : describeIntent(intent), journeys };
      }
    } else if (intent.personCandidate) {
      const person = await runPerson(intent.personCandidate, "auto", intent, true);
      if (person) return { ...person, mode: "person", journeys };
    }
  } catch {
    // Interpretation is best-effort: any failure falls back to plain title search.
  }

  return titleResponse;
}

/**
 * Deterministic search. Results are PUBLIC (identical for every user), so
 * whole responses are cached per normalized query for a few minutes — a
 * repeated query, or the same query from the palette and the search page,
 * costs nothing after the first time.
 */
const cachedSearch = unstable_cache(computeSearch, ["search-v2"], { revalidate: TMDB_CACHE.search, tags: ["search"] });

export function runSearch(query: string): Promise<SearchResponse> {
  return cachedSearch(query.trim().replace(/\s+/g, " ").toLowerCase());
}
