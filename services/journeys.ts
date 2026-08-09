import "server-only";
import { searchMovieForResolution, getMovieDetails } from "@/services/tmdb";
import { listWatchedMovieIds } from "@/services/watch-history";
import { JOURNEYS } from "@/lib/journeys/definitions";
import type { TmdbMovie } from "@/types/tmdb";
import type {
  JourneyDef,
  JourneyMovieDef,
  JourneyOrderType,
  JourneyProgress,
  ResolvedJourneyMovie,
} from "@/types/journey";
import type { StoredMovie } from "@/types/storage";

/**
 * Matches a static journey entry (title + year) against TMDB search
 * results — never a hardcoded id, since a static config file has no way
 * to verify one itself. Prefers an exact title match in the verified
 * release year; falls back to the closest same-title match if TMDB's
 * date is off by a cut/festival release; returns null (never throws) if
 * nothing usable comes back, so one bad lookup can't take down the whole
 * journey.
 */
async function findBestMatch(def: JourneyMovieDef): Promise<TmdbMovie | null> {
  try {
    const { results } = await searchMovieForResolution(def.title);
    if (results.length === 0) return null;

    const normalizedTitle = def.title.toLowerCase();
    const sameTitle = results.filter((m) => m.title.toLowerCase() === normalizedTitle);
    const pool = sameTitle.length > 0 ? sameTitle : results;

    const exactYear = pool.find((m) => m.release_date?.slice(0, 4) === def.releaseYear);
    return exactYear ?? pool[0];
  } catch {
    return null;
  }
}

const EMPTY_RESOLUTION = { posterPath: null, voteAverage: null, runtime: null, tagline: null, overview: null } as const;

/** Full resolution (id + poster + rating + runtime) for every movie in a
 *  journey, in parallel — used by the journey detail page's timeline,
 *  where every field on the card is actually rendered. A single failed
 *  lookup degrades to a null-id placeholder (still occupies its position
 *  in the order) rather than dropping the entry or failing the journey. */
async function resolveJourneyMovies(defs: JourneyMovieDef[]): Promise<Omit<ResolvedJourneyMovie, "state">[]> {
  const settled = await Promise.allSettled(
    defs.map(async (def) => {
      const match = await findBestMatch(def);
      if (!match) return { ...def, id: null, ...EMPTY_RESOLUTION };

      const details = await getMovieDetails(match.id).catch(() => null);
      return {
        ...def,
        id: match.id,
        posterPath: details?.poster_path ?? match.poster_path,
        voteAverage: details?.vote_average ?? match.vote_average,
        runtime: details?.runtime ?? null,
        // Real tagline when TMDB has one, otherwise the overview — both
        // come from the same details call already being made for runtime,
        // so this is free. Never fabricated: null when TMDB has neither.
        tagline: details?.tagline || null,
        overview: details?.overview || null,
      };
    })
  );

  return settled.map((result, i) =>
    result.status === "fulfilled" ? result.value : { ...defs[i], id: null, ...EMPTY_RESOLUTION }
  );
}

/** Light resolution (id + poster only, no runtime) — used for the journey
 *  discovery grid, where a card only ever shows poster art, not runtime.
 *  Skips the second (details) request entirely per movie. */
async function resolveJourneyMoviesLight(
  defs: JourneyMovieDef[]
): Promise<{ id: number | null; posterPath: string | null }[]> {
  const settled = await Promise.allSettled(
    defs.map(async (def) => {
      const match = await findBestMatch(def);
      return { id: match?.id ?? null, posterPath: match?.poster_path ?? null };
    })
  );
  return settled.map((result) => (result.status === "fulfilled" ? result.value : { id: null, posterPath: null }));
}

function orderIndex(movie: JourneyMovieDef, orderType: JourneyOrderType): number {
  if (orderType === "chronological") return movie.chronologicalOrder ?? movie.releaseOrder;
  return movie.releaseOrder;
}

/** Essential order only ever includes entries the definition explicitly
 *  flags `isEssential` — never inferred or invented. */
function selectForOrder<T extends JourneyMovieDef>(movies: T[], orderType: JourneyOrderType): T[] {
  const pool = orderType === "essential" ? movies.filter((m) => m.isEssential) : movies;
  return [...pool].sort((a, b) => orderIndex(a, orderType) - orderIndex(b, orderType));
}

/** Walks an already-ordered list and assigns watched/next/upcoming — the
 *  first not-yet-watched entry in THIS order becomes "next", so switching
 *  watch order can genuinely change which movie is highlighted. */
function annotateState(
  movies: Omit<ResolvedJourneyMovie, "state">[],
  watchedIds: Set<number>
): ResolvedJourneyMovie[] {
  let nextAssigned = false;
  return movies.map((movie) => {
    const watched = movie.id !== null && watchedIds.has(movie.id);
    if (watched) return { ...movie, state: "watched" as const };
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...movie, state: "next" as const };
    }
    return { ...movie, state: "upcoming" as const };
  });
}

export interface JourneyDetail extends Omit<JourneyDef, "movies"> {
  /** The full journey in release order with watched state — always the
   *  source for header stats and the dashboard/movie-detail "Continue
   *  Journey" default, regardless of which order the timeline shows. */
  releaseOrderMovies: ResolvedJourneyMovie[];
  /** The selected order's movies, with watched/next state relative to
   *  that order — this is what the timeline renders. */
  timeline: ResolvedJourneyMovie[];
  selectedOrder: JourneyOrderType;
  progress: JourneyProgress;
}

/**
 * The single entry point for rendering a full journey — resolves every
 * movie once, then derives both the always-release-order progress
 * summary and the (possibly reordered/filtered) timeline for the
 * requested order. `userId` null (guest) just means nothing is watched.
 */
export async function getJourneyDetail(
  journeyDef: JourneyDef,
  selectedOrder: JourneyOrderType,
  userId: string | null
): Promise<JourneyDetail> {
  // Definitions are authored in release order already, so this doubles as
  // the release-ordered list with no extra sort.
  const resolved = await resolveJourneyMovies(journeyDef.movies);

  const allIds = resolved.map((m) => m.id).filter((id): id is number => id !== null);
  const watchedIds = userId ? await listWatchedMovieIds(userId, allIds) : new Set<number>();

  const releaseOrderMovies = annotateState(resolved, watchedIds);
  const watchedCount = releaseOrderMovies.filter((m) => m.state === "watched").length;
  const nextMovie = releaseOrderMovies.find((m) => m.state === "next") ?? null;

  const orderedForSelection = selectForOrder(resolved, selectedOrder);
  const timeline = annotateState(orderedForSelection, watchedIds);

  return {
    ...journeyDef,
    releaseOrderMovies,
    timeline,
    selectedOrder,
    progress: { watchedCount, totalCount: releaseOrderMovies.length, nextMovie },
  };
}

export interface JourneyCardPreview {
  id: string;
  name: string;
  shortName: string;
  description: string;
  totalCount: number;
  /** A handful of posters (release order) for the card's artwork collage. */
  posterPaths: (string | null)[];
  /** Null when signed out — the card shows no progress rather than a fake "0/23". */
  watchedCount: number | null;
}

const PREVIEW_POSTER_COUNT = 4;

/** Lightweight version of journey resolution for the discovery grid — only
 *  fetches what a journey card actually shows (poster art, optional
 *  watched count), never runtime/rating, so browsing all journeys doesn't
 *  pay for detail-page-level data on every single entry. */
export async function getJourneyCardPreview(journeyDef: JourneyDef, userId: string | null): Promise<JourneyCardPreview> {
  const light = await resolveJourneyMoviesLight(journeyDef.movies);
  const posterPaths = light.slice(0, PREVIEW_POSTER_COUNT).map((m) => m.posterPath);

  let watchedCount: number | null = null;
  if (userId) {
    const ids = light.map((m) => m.id).filter((id): id is number => id !== null);
    const watchedIds = await listWatchedMovieIds(userId, ids);
    watchedCount = ids.filter((id) => watchedIds.has(id)).length;
  }

  return {
    id: journeyDef.id,
    name: journeyDef.name,
    shortName: journeyDef.shortName,
    description: journeyDef.description,
    totalCount: journeyDef.movies.length,
    posterPaths,
    watchedCount,
  };
}

/**
 * Cheap, TMDB-free heuristic for "which journey should the dashboard
 * feature" — matches the user's already-fetched recent watch history
 * (titles only, no extra query) against each journey's movie titles, and
 * returns the journey with the most overlap. The actual progress shown
 * afterward still comes from `getJourneyDetail`'s full (not just-recent)
 * watched lookup — this only decides *which* journey to feature.
 */
export function pickActiveJourney(recentHistory: StoredMovie[]): JourneyDef | null {
  if (recentHistory.length === 0) return null;

  const watchedTitles = new Set(recentHistory.map((m) => m.title.toLowerCase()));

  let best: { journey: JourneyDef; overlap: number } | null = null;
  for (const journey of JOURNEYS) {
    const overlap = journey.movies.filter((m) => watchedTitles.has(m.title.toLowerCase())).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) {
      best = { journey, overlap };
    }
  }

  return best?.journey ?? null;
}

export function listJourneyDefs(): JourneyDef[] {
  return JOURNEYS;
}
