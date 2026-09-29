import type {
  CuratedJourneyMovie,
  JourneyDefinition,
  JourneyMovieState,
  JourneyOrderType,
  JourneyProgress,
  JourneyRanking,
  JourneyRules,
  ResolvedJourneyMovie,
} from "@/types/journey";
import { normalizeText } from "@/lib/journeys/definitions";

// The Journey engine — pure and deterministic. Takes a definition plus
// candidate movies (already fetched from TMDB by services/journeys) and
// decides membership, ranking, quality threshold, and order. No I/O and no
// randomness: the same definition + the same TMDB data always yields the
// same journey, which is what the unit tests in tests/ lock down.

/** A candidate movie normalized from any TMDB source (discover, collection, credits, trending). */
export interface JourneyCandidate {
  id: number;
  title: string;
  /** YYYY-MM-DD, or null if TMDB has no date. */
  releaseDate: string | null;
  posterPath: string | null;
  overview: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  originalLanguage: string;
}

/** One member of a resolved journey, before per-user watched state is applied. */
export interface JourneyMember extends CuratedJourneyMovie {
  id: number | null;
  posterPath: string | null;
  voteAverage: number | null;
  overview: string | null;
}

export type JourneyBuildResult =
  | {
      status: "available";
      /** Members in release order. */
      members: JourneyMember[];
      /** Best-ranked posters, for the discovery card's artwork. */
      previewPosters: string[];
    }
  | { status: "insufficient"; reason: string; qualifying: number };

const DEFAULT_RANKING: Required<Omit<JourneyRanking, "priorVotes">> = {
  quality: 0.5,
  consensus: 0.3,
  popularity: 0.2,
  recency: 0,
};

/** Global mean rating used as the Bayesian prior. */
const PRIOR_MEAN_RATING = 6.5;
const DEFAULT_PRIOR_VOTES = 500;
const CONSENSUS_REFERENCE_VOTES = 20_000;
const POPULARITY_REFERENCE = 200;
const RECENCY_HALF_LIFE_YEARS = 3;
const DAY_MS = 86_400_000;

// --- Rules -----------------------------------------------------------------

export function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Local enforcement of every rule — the guarantee that nothing unrelated
 * slips in even if TMDB ignored a parameter. Released-only is implicit:
 * unreleased or undated titles never join a ranked journey.
 */
export function passesRules(candidate: JourneyCandidate, rules: JourneyRules | undefined, nowMs: number): boolean {
  const today = isoDate(nowMs);
  if (!candidate.releaseDate || candidate.releaseDate > today) return false;
  if (!rules) return true;

  const genres = new Set(candidate.genreIds);
  if (rules.genres && !rules.genres.every((genre) => genres.has(genre))) return false;
  if (rules.anyGenres && !rules.anyGenres.some((genre) => genres.has(genre))) return false;
  if (rules.excludeGenres && rules.excludeGenres.some((genre) => genres.has(genre))) return false;

  if (rules.languages && !rules.languages.includes(candidate.originalLanguage)) return false;
  if (rules.excludeLanguages && rules.excludeLanguages.includes(candidate.originalLanguage)) return false;

  const year = Number(candidate.releaseDate.slice(0, 4));
  if (rules.releasedAfterYear !== undefined && year < rules.releasedAfterYear) return false;
  if (rules.releasedBeforeYear !== undefined && year > rules.releasedBeforeYear) return false;
  if (rules.releasedWithinDays !== undefined && candidate.releaseDate < isoDate(nowMs - rules.releasedWithinDays * DAY_MS)) {
    return false;
  }

  if (rules.minVotes !== undefined && candidate.voteCount < rules.minVotes) return false;
  if (rules.maxVotes !== undefined && candidate.voteCount > rules.maxVotes) return false;
  if (rules.minRating !== undefined && candidate.voteAverage < rules.minRating) return false;
  if (rules.maxPopularity !== undefined && candidate.popularity > rules.maxPopularity) return false;

  return true;
}

/**
 * Translates rules into TMDB /discover parameters so the candidate pool
 * arrives pre-filtered. Only what TMDB can express is sent; everything is
 * still re-checked by `passesRules`.
 */
export function rulesToDiscoverParams(rules: JourneyRules | undefined, nowMs: number): Record<string, string> {
  const params: Record<string, string> = { "primary_release_date.lte": isoDate(nowMs) };
  if (!rules) return params;

  if (rules.genres?.length) params.with_genres = rules.genres.join(",");
  else if (rules.anyGenres?.length) params.with_genres = rules.anyGenres.join("|");
  if (rules.excludeGenres?.length) params.without_genres = rules.excludeGenres.join(",");
  if (rules.originCountry) params.with_origin_country = rules.originCountry;

  const afterDates: string[] = [];
  if (rules.releasedAfterYear !== undefined) afterDates.push(`${rules.releasedAfterYear}-01-01`);
  if (rules.releasedWithinDays !== undefined) afterDates.push(isoDate(nowMs - rules.releasedWithinDays * DAY_MS));
  if (afterDates.length) params["primary_release_date.gte"] = afterDates.sort().at(-1)!;
  if (rules.releasedBeforeYear !== undefined) {
    const before = `${rules.releasedBeforeYear}-12-31`;
    if (before < params["primary_release_date.lte"]) params["primary_release_date.lte"] = before;
  }

  if (rules.minVotes !== undefined) params["vote_count.gte"] = String(rules.minVotes);
  if (rules.maxVotes !== undefined) params["vote_count.lte"] = String(rules.maxVotes);
  if (rules.minRating !== undefined) params["vote_average.gte"] = String(rules.minRating);
  if (rules.minRuntime !== undefined) params["with_runtime.gte"] = String(rules.minRuntime);
  if (rules.maxRuntime !== undefined) params["with_runtime.lte"] = String(rules.maxRuntime);
  return params;
}

// --- Scoring ---------------------------------------------------------------

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Rating pulled toward the global mean in proportion to how few votes back it. */
export function bayesianRating(voteAverage: number, voteCount: number, priorVotes: number): number {
  return (voteCount / (voteCount + priorVotes)) * voteAverage + (priorVotes / (voteCount + priorVotes)) * PRIOR_MEAN_RATING;
}

/** Deterministic 0–1 ranking score from rating, consensus, popularity, and recency. */
export function scoreCandidate(candidate: JourneyCandidate, ranking: JourneyRanking | undefined, nowMs: number): number {
  const weights = rankingWeights(ranking);
  const priorVotes = ranking?.priorVotes ?? DEFAULT_PRIOR_VOTES;

  const components = {
    quality: clamp01(bayesianRating(candidate.voteAverage, candidate.voteCount, priorVotes) / 10),
    consensus: clamp01(Math.log10(1 + candidate.voteCount) / Math.log10(1 + CONSENSUS_REFERENCE_VOTES)),
    popularity: clamp01(Math.log10(1 + candidate.popularity) / Math.log10(1 + POPULARITY_REFERENCE)),
    recency: candidate.releaseDate
      ? Math.pow(0.5, Math.max(0, (nowMs - Date.parse(candidate.releaseDate)) / (365.25 * DAY_MS)) / RECENCY_HALF_LIFE_YEARS)
      : 0,
  };

  let total = 0;
  let weightSum = 0;
  for (const key of Object.keys(components) as (keyof typeof components)[]) {
    const weight = weights[key] ?? 0;
    total += weight * components[key];
    weightSum += weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

/**
 * A ranking that names any weight replaces the defaults entirely (unnamed
 * weights → 0); one that only tunes `priorVotes` keeps the defaults.
 */
function rankingWeights(ranking: JourneyRanking | undefined): typeof DEFAULT_RANKING {
  if (!ranking) return DEFAULT_RANKING;
  const named = {
    quality: ranking.quality ?? 0,
    consensus: ranking.consensus ?? 0,
    popularity: ranking.popularity ?? 0,
    recency: ranking.recency ?? 0,
  };
  return Object.values(named).some((weight) => weight > 0) ? named : DEFAULT_RANKING;
}

// --- Selection ---------------------------------------------------------------

function dedupeCandidates(candidates: JourneyCandidate[]): JourneyCandidate[] {
  const byId = new Map<number, JourneyCandidate>();
  const byTitleYear = new Set<string>();
  // Sort first so which duplicate survives is deterministic regardless of source order.
  for (const candidate of [...candidates].sort((a, b) => b.voteCount - a.voteCount || a.id - b.id)) {
    if (byId.has(candidate.id)) continue;
    const titleYear = `${normalizeText(candidate.title)}|${candidate.releaseDate?.slice(0, 4) ?? ""}`;
    if (byTitleYear.has(titleYear)) continue;
    byId.set(candidate.id, candidate);
    byTitleYear.add(titleYear);
  }
  return [...byId.values()];
}

function decadeOf(candidate: JourneyCandidate): string {
  return candidate.releaseDate ? `${candidate.releaseDate.slice(0, 3)}0s` : "unknown";
}

function byReleaseDate(a: { releaseDate: string | null; id: number }, b: { releaseDate: string | null; id: number }): number {
  return (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "") || a.id - b.id;
}

/**
 * Builds a ranked (non-curated) journey:
 *   candidates → dedupe → hard rules → score → diversity-capped selection
 *   → quality threshold → release order.
 * Returns "insufficient" (and the journey is hidden) when too few movies
 * qualify — never padded with weak matches.
 */
export function buildRankedJourney(
  definition: JourneyDefinition,
  candidates: JourneyCandidate[],
  nowMs: number
): JourneyBuildResult {
  const qualifying = dedupeCandidates(candidates).filter(
    (candidate) => candidate.posterPath && passesRules(candidate, definition.rules, nowMs)
  );

  const scored = qualifying
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, definition.ranking, nowMs) }))
    .sort((a, b) => b.score - a.score || b.candidate.voteCount - a.candidate.voteCount || a.candidate.id - b.candidate.id);

  const maxMovies = definition.selection?.maxMovies ?? 15;
  const perDecadeCap = definition.selection?.perDecadeCap;
  const perLanguageCap = definition.selection?.perLanguageCap;
  const decadeCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  const selected: typeof scored = [];

  for (const entry of scored) {
    if (selected.length >= maxMovies) break;
    const decade = decadeOf(entry.candidate);
    const language = entry.candidate.originalLanguage;
    if (perDecadeCap !== undefined && (decadeCounts.get(decade) ?? 0) >= perDecadeCap) continue;
    if (perLanguageCap !== undefined && (languageCounts.get(language) ?? 0) >= perLanguageCap) continue;
    selected.push(entry);
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
  }

  if (selected.length < definition.minimumMovies) {
    return {
      status: "insufficient",
      reason: `Only ${selected.length} qualifying movies (needs ${definition.minimumMovies})`,
      qualifying: selected.length,
    };
  }

  const previewPosters = selected.slice(0, 4).map((entry) => entry.candidate.posterPath as string);
  const members = selected
    .map((entry) => entry.candidate)
    .sort(byReleaseDate)
    .map(
      (candidate, index): JourneyMember => ({
        id: candidate.id,
        title: candidate.title,
        releaseYear: candidate.releaseDate?.slice(0, 4) ?? "",
        releaseOrder: index + 1,
        posterPath: candidate.posterPath,
        voteAverage: candidate.voteAverage,
        overview: candidate.overview || null,
      })
    );

  return { status: "available", members, previewPosters };
}

/** A curated entry after title resolution — `candidate` is null when TMDB had no confident match. */
export interface CuratedResolution {
  movie: CuratedJourneyMovie;
  candidate: JourneyCandidate | null;
}

/**
 * Builds a curated franchise journey. Membership and orders come from the
 * hand-verified definition; TMDB only supplies ids/posters. An entry that
 * couldn't be resolved stays in place as a placeholder so the documented
 * order is preserved. Hidden only if too few entries resolved at all.
 */
export function buildCuratedJourney(definition: JourneyDefinition, resolutions: CuratedResolution[]): JourneyBuildResult {
  const resolvedCount = resolutions.filter((entry) => entry.candidate).length;
  if (resolvedCount < definition.minimumMovies) {
    return {
      status: "insufficient",
      reason: `Only ${resolvedCount} titles resolved on TMDB (needs ${definition.minimumMovies})`,
      qualifying: resolvedCount,
    };
  }

  const members = [...resolutions]
    .sort((a, b) => a.movie.releaseOrder - b.movie.releaseOrder)
    .map(
      ({ movie, candidate }): JourneyMember => ({
        ...movie,
        id: candidate?.id ?? null,
        posterPath: candidate?.posterPath ?? null,
        voteAverage: candidate?.voteAverage ?? null,
        overview: candidate?.overview || null,
      })
    );

  const previewPosters = members.flatMap((member) => (member.posterPath ? [member.posterPath] : [])).slice(0, 4);
  return { status: "available", members, previewPosters };
}

// --- Ordering & progress --------------------------------------------------------

/**
 * Members for a watch order. Chronological falls back to release position
 * for entries without one; Essential includes only entries the definition
 * explicitly flags — never inferred.
 */
export function orderMembers<T extends CuratedJourneyMovie>(members: T[], order: JourneyOrderType): T[] {
  const pool = order === "essential" ? members.filter((member) => member.isEssential) : members;
  const position = (member: T) =>
    order === "chronological" ? (member.chronologicalOrder ?? member.releaseOrder) : member.releaseOrder;
  return [...pool].sort((a, b) => position(a) - position(b));
}

/**
 * Walks an already-ordered list and assigns watched/next/upcoming: the
 * first not-yet-watched entry in *this* order is "next", so switching
 * watch order can genuinely change which movie is highlighted.
 */
export function annotateWatchState<T extends { id: number | null }>(
  movies: T[],
  watchedIds: ReadonlySet<number>
): (T & { state: JourneyMovieState })[] {
  let nextAssigned = false;
  return movies.map((movie) => {
    if (movie.id !== null && watchedIds.has(movie.id)) return { ...movie, state: "watched" as const };
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...movie, state: "next" as const };
    }
    return { ...movie, state: "upcoming" as const };
  });
}

export function computeProgress(releaseOrderMovies: ResolvedJourneyMovie[]): JourneyProgress {
  return {
    watchedCount: releaseOrderMovies.filter((movie) => movie.state === "watched").length,
    totalCount: releaseOrderMovies.length,
    nextMovie: releaseOrderMovies.find((movie) => movie.state === "next") ?? null,
  };
}
