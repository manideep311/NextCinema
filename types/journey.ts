// Movie Journeys — app-level types.
//
// Two layers:
//  1. DEFINITIONS (data): what a journey *is* — its source of candidate
//     movies, hard matching rules, ranking weights, and quality threshold.
//     Authored in lib/journeys/definitions/, consumed by the engine.
//  2. RESOLVED journeys (UI-facing): the ranked, ordered movie list with
//     per-user watched state that the existing Journey components render.

export type JourneyOrderType = "release" | "chronological" | "essential";

export type JourneyType = "franchise" | "genre" | "theme" | "mood" | "discovery";

/** What kind of franchise a franchise journey is — shown as the card's eyebrow label. */
export type FranchiseKind =
  | "universe"
  | "indian-universe"
  | "action"
  | "superhero"
  | "scifi-fantasy"
  | "animated"
  | "family"
  | "comedy"
  | "horror"
  | "crime-thriller"
  | "drama-romance"
  | "indian"
  | "world";

/**
 * How often a journey's membership can change, which sets how long its
 * resolved form is cached: curated/collection journeys barely move; ranked
 * genre/theme lists drift slowly; trending-based ones change within a day.
 */
export type JourneyFreshness = "weekly" | "daily" | "hourly";

/** A hand-verified franchise entry (title + year), with any orders the franchise genuinely supports. */
export interface CuratedJourneyMovie {
  /** Official theatrical title — matched against TMDB search results. */
  title: string;
  /** Verified release year — disambiguates remakes/re-releases. */
  releaseYear: string;
  /** 1-based position in theatrical release order. */
  releaseOrder: number;
  /** 1-based in-universe story order — only where a documented distinct order exists. */
  chronologicalOrder?: number;
  /** Part of the "main story only" path — only for franchises with a real optional/side split. */
  isEssential?: boolean;
}

/** Kept as an alias: older components refer to curated entries by this name. */
export type JourneyMovieDef = CuratedJourneyMovie;

/**
 * Hard membership rules. Where TMDB's /discover supports a rule it's sent
 * to TMDB (so the candidate pool is already filtered), and every rule is
 * also enforced locally — so an unsupported parameter can never let
 * unrelated movies through.
 */
export interface JourneyRules {
  /** Movie must have ALL of these genre ids. */
  genres?: number[];
  /** Movie must have AT LEAST ONE of these genre ids. */
  anyGenres?: number[];
  /** Movie must have NONE of these genre ids. */
  excludeGenres?: number[];
  /** ISO 639-1 original-language codes (any of). */
  languages?: string[];
  /** Original languages to exclude (e.g. "en" for International Cinema). */
  excludeLanguages?: string[];
  /** ISO 3166-1 production-origin country (sent to TMDB as `with_origin_country`). */
  originCountry?: string;
  releasedAfterYear?: number;
  releasedBeforeYear?: number;
  /** Rolling window, evaluated at resolution time — what makes "recent" journeys refresh themselves. */
  releasedWithinDays?: number;
  minVotes?: number;
  maxVotes?: number;
  minRating?: number;
  /** Local-only: TMDB popularity ceiling (used to keep "hidden gem" journeys genuinely under-seen). */
  maxPopularity?: number;
  /** Sent to TMDB only — list results don't include runtime. */
  minRuntime?: number;
  maxRuntime?: number;
}

export type JourneySortBy = "vote_average.desc" | "vote_count.desc" | "popularity.desc" | "primary_release_date.desc";

/** Where a journey's candidate movies come from. */
export type JourneySource =
  /** Hand-verified title list with genuine alternate orders (MCU, Star Wars, ...). */
  | { kind: "curated"; movies: CuratedJourneyMovie[]; orders: JourneyOrderType[] }
  /** TMDB collections (series), by verified name + id — see lib/journeys/definitions/tmdb-collections.ts. */
  | { kind: "collection"; collections: { name: string; id: number }[] }
  /** TMDB keywords, resolved by exact name at runtime; movies must be tagged with at least one. */
  | { kind: "keyword"; keywords: string[]; sortBy?: JourneySortBy; pages?: number }
  /** A TMDB /discover query built from the journey's rules. */
  | { kind: "discover"; sortBy: JourneySortBy; pages?: number }
  /** A person's filmography — as director, or in a leading role. */
  | { kind: "person"; name: string; role: "director" | "lead" }
  /** TMDB's trending lists — membership changes as the trend does. */
  | { kind: "trending"; window: "day" | "week"; pages: number };

/** Soft ranking weights (any subset; normalized by their sum). */
export interface JourneyRanking {
  /** Bayesian-adjusted rating. */
  quality?: number;
  /** Vote count (log-scaled) — how established the consensus is. */
  consensus?: number;
  popularity?: number;
  /** Newer releases score higher. */
  recency?: number;
  /** Prior strength for the Bayesian rating — lower for smaller industries with fewer TMDB votes. */
  priorVotes?: number;
}

export interface JourneySelection {
  maxMovies: number;
  /** Spread across eras: at most this many movies per release decade. */
  perDecadeCap?: number;
  /** Spread across languages (International Cinema). */
  perLanguageCap?: number;
}

export interface JourneyDefinition {
  id: string;
  type: JourneyType;
  /** Franchise journeys only: which kind of franchise (cinematic universe, horror series, …). */
  franchiseKind?: FranchiseKind;
  name: string;
  /** Short label for tight spaces (search matches, "Continue the X journey"). */
  shortName: string;
  description: string;
  /** Extra search terms beyond the name. */
  aliases?: string[];
  source: JourneySource;
  rules?: JourneyRules;
  ranking?: JourneyRanking;
  selection?: JourneySelection;
  /** Below this many qualifying movies the journey is not shown at all. */
  minimumMovies: number;
  freshness: JourneyFreshness;
}

export type JourneyMovieState = "watched" | "next" | "upcoming";

/**
 * A journey movie resolved against the live TMDB catalog. `id` is null
 * only for curated entries whose title couldn't be resolved — rendered as
 * a "poster unavailable" placeholder so the order stays intact.
 */
export interface ResolvedJourneyMovie extends CuratedJourneyMovie {
  id: number | null;
  posterPath: string | null;
  voteAverage: number | null;
  runtime: number | null;
  /** Real TMDB tagline/overview when available — never invented. */
  tagline: string | null;
  overview: string | null;
  state: JourneyMovieState;
}

export interface JourneyProgress {
  watchedCount: number;
  totalCount: number;
  /** Next unwatched movie in release order; null once every movie is watched. */
  nextMovie: ResolvedJourneyMovie | null;
}

/** Lightweight match shown above search results. */
export interface JourneySearchResult {
  id: string;
  name: string;
  movieCount: number;
  orderLabel: string;
}
