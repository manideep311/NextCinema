import "server-only";
import {
  discoverMovies,
  getCollection,
  getPersonMovieCredits,
  getTrendingMovies,
  searchKeywords,
  searchMovieForResolution,
  searchPeople,
  type DiscoverParams,
} from "@/services/tmdb";
import { normalizeText } from "@/lib/journeys/definitions";
import { rulesToDiscoverParams, type CuratedResolution, type JourneyCandidate } from "@/lib/journeys/engine";
import type { CuratedJourneyMovie, JourneyDefinition, JourneySource } from "@/types/journey";
import type { TmdbMovie } from "@/types/tmdb";

// Fetches candidate movies for a journey definition from TMDB. Every
// name-based source (collections, keywords, people) is resolved at
// runtime from TMDB's own search — no ids are hardcoded, and a name that
// doesn't resolve contributes nothing rather than a guess.

export class JourneySourceUnavailableError extends Error {
  constructor(journeyId: string) {
    super(`Every TMDB request for journey "${journeyId}" failed`);
    this.name = "JourneySourceUnavailableError";
  }
}

export function toCandidate(movie: TmdbMovie): JourneyCandidate {
  return {
    id: movie.id,
    title: movie.title,
    releaseDate: movie.release_date || null,
    posterPath: movie.poster_path,
    overview: movie.overview || null,
    voteAverage: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
    popularity: movie.popularity ?? 0,
    genreIds: movie.genre_ids ?? [],
    originalLanguage: movie.original_language ?? "",
  };
}

/** Tracks whether *any* request succeeded, so a TMDB outage is never cached as "this journey has no movies". */
class SourceCollector {
  candidates: JourneyCandidate[] = [];
  collectionIds: number[] = [];
  private succeeded = 0;
  private failed = 0;

  async run<T>(requests: Promise<T>[], onResult: (result: T) => void): Promise<void> {
    const settled = await Promise.allSettled(requests);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        this.succeeded++;
        onResult(result.value);
      } else {
        this.failed++;
      }
    }
  }

  addMovies(movies: TmdbMovie[]) {
    for (const movie of movies) if (!movie.adult) this.candidates.push(toCandidate(movie));
  }

  get allFailed(): boolean {
    return this.succeeded === 0 && this.failed > 0;
  }
}

async function resolveKeywordIds(names: string[]): Promise<number[]> {
  const ids = await Promise.all(
    names.map(async (name) => {
      const { results } = await searchKeywords(name);
      const target = normalizeText(name);
      return results.find((keyword) => normalizeText(keyword.name) === target)?.id ?? null;
    })
  );
  return [...new Set(ids.filter((id): id is number => id !== null))];
}

async function resolvePersonId(name: string, role: "director" | "lead"): Promise<number | null> {
  const { results } = await searchPeople(name);
  const target = normalizeText(name);
  const department = role === "director" ? "Directing" : "Acting";
  const matches = results
    .filter((person) => normalizeText(person.name) === target)
    .sort(
      (a, b) =>
        Number(b.known_for_department === department) - Number(a.known_for_department === department) ||
        b.popularity - a.popularity
    );
  return matches[0]?.id ?? null;
}

function discoverRequests(
  definition: JourneyDefinition,
  base: DiscoverParams,
  pages: number,
  revalidateSeconds: number
): Promise<{ results: TmdbMovie[] }>[] {
  // with_original_language takes one code, so multi-language rules fan out per language.
  const languages = definition.rules?.languages?.length ? definition.rules.languages : [undefined];
  const requests: Promise<{ results: TmdbMovie[] }>[] = [];
  for (const language of languages) {
    for (let page = 1; page <= pages; page++) {
      requests.push(
        discoverMovies(
          { ...base, ...(language ? { with_original_language: language } : {}), page: String(page) },
          revalidateSeconds
        )
      );
    }
  }
  return requests;
}

const FRESHNESS_TO_SECONDS = { hourly: 60 * 60, daily: 60 * 60 * 24, weekly: 60 * 60 * 24 * 7 } as const;

export async function fetchJourneyCandidates(
  definition: JourneyDefinition,
  nowMs: number
): Promise<{ candidates: JourneyCandidate[]; collectionIds: number[] }> {
  const source: JourneySource = definition.source;
  const collector = new SourceCollector();
  const listRevalidate = FRESHNESS_TO_SECONDS[definition.freshness];

  switch (source.kind) {
    case "curated":
      throw new Error("Curated journeys are resolved with resolveCuratedMovies");

    case "collection": {
      // Verified ids (lib/journeys/definitions/tmdb-collections.ts) — one request per collection, no search.
      collector.collectionIds = source.collections.map((entry) => entry.id);
      await collector.run(collector.collectionIds.map(getCollection), (collection) => collector.addMovies(collection.parts));
      break;
    }

    case "keyword": {
      let keywordIds: number[] = [];
      await collector.run([resolveKeywordIds(source.keywords)], (ids) => {
        keywordIds = ids;
      });
      if (keywordIds.length === 0) break; // No such TMDB keyword → no members, not a guess.
      const params: DiscoverParams = {
        ...rulesToDiscoverParams(definition.rules, nowMs),
        with_keywords: keywordIds.join("|"),
        sort_by: source.sortBy ?? "vote_count.desc",
      };
      await collector.run(discoverRequests(definition, params, source.pages ?? 2, listRevalidate), (page) =>
        collector.addMovies(page.results)
      );
      break;
    }

    case "discover": {
      const params: DiscoverParams = { ...rulesToDiscoverParams(definition.rules, nowMs), sort_by: source.sortBy };
      await collector.run(discoverRequests(definition, params, source.pages ?? 2, listRevalidate), (page) =>
        collector.addMovies(page.results)
      );
      break;
    }

    case "person": {
      let personId: number | null = null;
      await collector.run([resolvePersonId(source.name, source.role)], (id) => {
        personId = id;
      });
      if (personId === null) break;
      await collector.run([getPersonMovieCredits(personId)], (credits) => {
        const films =
          source.role === "director"
            ? credits.crew.filter((credit) => credit.job === "Director")
            : credits.cast.filter((credit) => credit.order <= 2);
        collector.addMovies(films);
      });
      break;
    }

    case "trending": {
      const requests = Array.from({ length: source.pages }, (_, index) => getTrendingMovies(index + 1, source.window));
      await collector.run(requests, (page) => collector.addMovies(page.results));
      break;
    }
  }

  if (collector.allFailed) throw new JourneySourceUnavailableError(definition.id);
  return { candidates: collector.candidates, collectionIds: collector.collectionIds };
}

/**
 * Resolves curated title + year entries against TMDB search, in order of
 * confidence: exact title in the verified year → exact title in another
 * year (festival vs theatrical dates) → TMDB's top hit released in the
 * verified year (TMDB titles some films differently, e.g. "Star Wars" for
 * Episode IV) → unresolved placeholder. Never an arbitrary first hit.
 */
export async function resolveCuratedMovies(
  journeyId: string,
  movies: CuratedJourneyMovie[]
): Promise<CuratedResolution[]> {
  const settled = await Promise.allSettled(movies.map((movie) => searchMovieForResolution(movie.title)));
  if (settled.every((result) => result.status === "rejected")) throw new JourneySourceUnavailableError(journeyId);

  return movies.map((movie, index) => {
    const result = settled[index];
    if (result.status === "rejected") return { movie, candidate: null };
    const target = normalizeText(movie.title);
    const sameTitle = result.value.results.filter((hit) => normalizeText(hit.title) === target);
    const sameYear = (hit: TmdbMovie) => hit.release_date?.slice(0, 4) === movie.releaseYear;
    const match =
      sameTitle.find(sameYear) ?? sameTitle[0] ?? result.value.results.find(sameYear) ?? null;
    return { movie, candidate: match ? toCandidate(match) : null };
  });
}
