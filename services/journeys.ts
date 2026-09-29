import "server-only";
import { unstable_cache } from "next/cache";
import {
  JOURNEY_DEFINITIONS,
  availableOrdersFor,
  definitionHash,
  findFranchiseDefinitionForMovie,
  getJourneyDefinition,
  journeyLabel,
  matchesJourneyQuery,
} from "@/lib/journeys/definitions";
import {
  annotateWatchState,
  buildCuratedJourney,
  buildRankedJourney,
  computeProgress,
  orderMembers,
  type JourneyMember,
} from "@/lib/journeys/engine";
import { fetchJourneyCandidates, resolveCuratedMovies } from "@/services/journey-sources";
import { getMovieDetails } from "@/services/tmdb";
import { getMostRecentJourneyId, listAllWatchedIds, listWatchedIdsAmong } from "@/services/watched";
import type {
  JourneyDefinition,
  JourneyOrderType,
  JourneyProgress,
  JourneySearchResult,
  JourneyType,
  ResolvedJourneyMovie,
} from "@/types/journey";

// Journey resolution + caching.
//
//   TMDB metadata ──► candidates ──► rules ──► ranking ──► quality threshold ──► journey
//
// Three cache layers, all holding PUBLIC data only (per-user watched state
// is applied after reading from cache, never stored in it):
//  1. Each journey's resolved membership — cached for its definition's
//     freshness (hourly for trending-based journeys, daily for ranked
//     lists, weekly for franchises). The key includes a hash of the
//     definition, so editing one invalidates only that journey.
//  2. The catalog — every available journey's summary — refreshed hourly;
//     rebuilding it mostly reads layer 1, so only expired journeys refetch.
//  3. Per-movie runtime/tagline for detail pages — cached weekly.
// Stale entries are served while Next revalidates them in the background,
// so a journey refresh never blocks a page view.

const FRESHNESS_SECONDS = { hourly: 60 * 60, daily: 60 * 60 * 24, weekly: 60 * 60 * 24 * 7 } as const;

interface ResolvedJourneyData {
  id: string;
  status: "available" | "insufficient";
  reason: string | null;
  members: JourneyMember[];
  previewPosters: string[];
  /** TMDB collection ids backing a franchise journey — lets a movie page find "its" journey. */
  collectionIds: number[];
}

async function resolveJourneyData(id: string, hash: string): Promise<ResolvedJourneyData> {
  const definition = getJourneyDefinition(id);
  if (!definition || definitionHash(definition) !== hash) {
    return { id, status: "insufficient", reason: "Unknown or changed definition", members: [], previewPosters: [], collectionIds: [] };
  }

  const nowMs = Date.now();
  if (definition.source.kind === "curated") {
    const result = buildCuratedJourney(definition, await resolveCuratedMovies(id, definition.source.movies));
    return result.status === "available"
      ? { id, status: "available", reason: null, members: result.members, previewPosters: result.previewPosters, collectionIds: [] }
      : { id, status: "insufficient", reason: result.reason, members: [], previewPosters: [], collectionIds: [] };
  }

  const { candidates, collectionIds } = await fetchJourneyCandidates(definition, nowMs);
  const result = buildRankedJourney(definition, candidates, nowMs);
  return result.status === "available"
    ? { id, status: "available", reason: null, members: result.members, previewPosters: result.previewPosters, collectionIds }
    : { id, status: "insufficient", reason: result.reason, members: [], previewPosters: [], collectionIds };
}

// unstable_cache needs a static revalidate per wrapper, so there's one per freshness tier.
const journeyDataByFreshness = {
  hourly: unstable_cache(resolveJourneyData, ["journey-data-v1", "hourly"], { revalidate: FRESHNESS_SECONDS.hourly, tags: ["journeys"] }),
  daily: unstable_cache(resolveJourneyData, ["journey-data-v1", "daily"], { revalidate: FRESHNESS_SECONDS.daily, tags: ["journeys"] }),
  weekly: unstable_cache(resolveJourneyData, ["journey-data-v1", "weekly"], { revalidate: FRESHNESS_SECONDS.weekly, tags: ["journeys"] }),
};

function getJourneyData(definition: JourneyDefinition): Promise<ResolvedJourneyData> {
  return journeyDataByFreshness[definition.freshness](definition.id, definitionHash(definition));
}

// --- Catalog --------------------------------------------------------------------

export interface JourneySummary {
  id: string;
  type: JourneyType;
  /** Card eyebrow, e.g. "Cinematic Universe", "Horror Franchise", "Mood Journey". */
  label: string;
  name: string;
  shortName: string;
  description: string;
  totalCount: number;
  previewPosters: string[];
  memberIds: number[];
  collectionIds: number[];
  orders: JourneyOrderType[];
}

interface JourneyCatalog {
  journeys: JourneySummary[];
  /** Definitions that didn't meet their quality threshold (kept for diagnostics). */
  hidden: { id: string; reason: string }[];
}

/** Fingerprint of the whole definition set — changes whenever any definition does. */
const CATALOG_KEY = JOURNEY_DEFINITIONS.map(definitionHash).join(".");

async function buildCatalog(): Promise<JourneyCatalog> {
  const settled = await Promise.allSettled(JOURNEY_DEFINITIONS.map(getJourneyData));
  const failures = settled.filter((result) => result.status === "rejected").length;
  // TMDB is down or rate-limiting hard: don't cache a hollowed-out catalog for an hour.
  if (failures > JOURNEY_DEFINITIONS.length / 4) {
    throw new Error(`Journey catalog unavailable (${failures} journeys failed to resolve)`);
  }

  const journeys: JourneySummary[] = [];
  const hidden: { id: string; reason: string }[] = [];
  settled.forEach((result, index) => {
    const definition = JOURNEY_DEFINITIONS[index];
    if (result.status === "rejected") {
      hidden.push({ id: definition.id, reason: "TMDB request failed" });
      return;
    }
    if (result.value.status !== "available") {
      hidden.push({ id: definition.id, reason: result.value.reason ?? "Insufficient data" });
      return;
    }
    const members = result.value.members;
    journeys.push({
      id: definition.id,
      type: definition.type,
      label: journeyLabel(definition),
      name: definition.name,
      shortName: definition.shortName,
      description: definition.description,
      totalCount: members.length,
      previewPosters: result.value.previewPosters,
      memberIds: members.flatMap((member) => (member.id !== null ? [member.id] : [])),
      collectionIds: result.value.collectionIds,
      orders: availableOrdersFor(definition),
    });
  });
  return { journeys, hidden };
}

const getCatalog = unstable_cache(buildCatalog, ["journey-catalog-v1", CATALOG_KEY], {
  revalidate: FRESHNESS_SECONDS.hourly,
  tags: ["journeys"],
});

/** Every journey currently meeting its quality threshold, in catalog order. */
export async function listAvailableJourneys(): Promise<JourneySummary[]> {
  return (await getCatalog()).journeys;
}

// --- Cards -----------------------------------------------------------------------

export interface JourneyCardPreview {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** Eyebrow label, e.g. "Cinematic Universe", "Horror Franchise", "Mood Journey". */
  typeLabel: string;
  totalCount: number;
  /** A handful of the journey's best-ranked posters for the card collage. */
  posterPaths: (string | null)[];
  /** Null when signed out — the card shows no progress rather than a fake "0/23". */
  watchedCount: number | null;
}

/**
 * The discovery grid. Watched counts for every card come from a single
 * query (the user's watched ids) intersected in memory — not one query per
 * journey. Journeys in progress are listed first.
 */
export async function listJourneyCards(userId: string | null): Promise<JourneyCardPreview[]> {
  const [journeys, watchedIds] = await Promise.all([
    listAvailableJourneys(),
    userId ? listAllWatchedIds(userId) : Promise.resolve(null),
  ]);

  const cards = journeys.map((journey): JourneyCardPreview => ({
    id: journey.id,
    name: journey.name,
    shortName: journey.shortName,
    description: journey.description,
    typeLabel: journey.label,
    totalCount: journey.totalCount,
    posterPaths: journey.previewPosters,
    watchedCount: watchedIds ? journey.memberIds.filter((id) => watchedIds.has(id)).length : null,
  }));

  const inProgress = (card: JourneyCardPreview) =>
    card.watchedCount !== null && card.watchedCount > 0 && card.watchedCount < card.totalCount;
  // Stable sort: in-progress journeys first, catalog order otherwise.
  return cards.sort((a, b) => Number(inProgress(b)) - Number(inProgress(a)));
}

// --- Detail ------------------------------------------------------------------------

type MemberDetails = Record<number, { runtime: number | null; tagline: string | null; overview: string | null }>;

async function fetchMemberDetails(ids: number[], strict: boolean): Promise<MemberDetails> {
  const settled = await Promise.allSettled(ids.map((id) => getMovieDetails(id)));
  if (strict && settled.some((result) => result.status === "rejected")) {
    throw new Error("Some journey member details failed to load");
  }
  const details: MemberDetails = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      details[ids[index]] = {
        runtime: result.value.runtime ?? null,
        tagline: result.value.tagline || null,
        overview: result.value.overview || null,
      };
    }
  });
  return details;
}

// Only complete results are cached (strict mode throws on any failure); a
// partial fetch is still used for the current request, just not stored.
const getCachedMemberDetails = unstable_cache((ids: number[]) => fetchMemberDetails(ids, true), ["journey-member-details-v1"], {
  revalidate: FRESHNESS_SECONDS.weekly,
  tags: ["journeys"],
});

export interface JourneyDetail {
  id: string;
  type: JourneyType;
  name: string;
  shortName: string;
  description: string;
  availableOrders: JourneyOrderType[];
  /** Full journey in release order with watched state — header stats and "what's next" defaults. */
  releaseOrderMovies: ResolvedJourneyMovie[];
  /** The selected order's movies, with watched/next state relative to that order. */
  timeline: ResolvedJourneyMovie[];
  selectedOrder: JourneyOrderType;
  progress: JourneyProgress;
}

/**
 * The single entry point for rendering a journey. Membership comes from
 * the cache; watched state is applied per request from the user's own
 * "watched" records (never from viewing history). Returns null for unknown
 * or currently-unavailable journeys.
 */
export async function getJourneyDetail(
  id: string,
  requestedOrder: JourneyOrderType | null,
  userId: string | null
): Promise<JourneyDetail | null> {
  const definition = getJourneyDefinition(id);
  if (!definition) return null;

  const data = await getJourneyData(definition);
  if (data.status !== "available") return null;

  const availableOrders = availableOrdersFor(definition);
  const selectedOrder = requestedOrder && availableOrders.includes(requestedOrder) ? requestedOrder : availableOrders[0];
  const ids = data.members.flatMap((member) => (member.id !== null ? [member.id] : []));

  const [details, watchedIds] = await Promise.all([
    getCachedMemberDetails(ids).catch(() => fetchMemberDetails(ids, false)),
    userId ? listWatchedIdsAmong(userId, ids) : Promise.resolve(new Set<number>()),
  ]);

  const members = data.members.map((member) => {
    const extra = member.id !== null ? details[member.id] : undefined;
    return {
      ...member,
      runtime: extra?.runtime ?? null,
      tagline: extra?.tagline ?? null,
      overview: extra?.overview ?? member.overview,
    };
  });

  const releaseOrderMovies = annotateWatchState(members, watchedIds);
  const timeline = annotateWatchState(orderMembers(members, selectedOrder), watchedIds);

  return {
    id: definition.id,
    type: definition.type,
    name: definition.name,
    shortName: definition.shortName,
    description: definition.description,
    availableOrders,
    releaseOrderMovies,
    timeline,
    selectedOrder,
    progress: computeProgress(releaseOrderMovies),
  };
}

/** The journey the user most recently marked progress in, for the dashboard's "Your Next Chapter". */
export async function getActiveJourney(userId: string): Promise<JourneyDetail | null> {
  const journeyId = await getMostRecentJourneyId(userId);
  return journeyId ? getJourneyDetail(journeyId, "release", userId) : null;
}

/**
 * The franchise journey a movie belongs to. The matching definition is
 * found from data the caller already has (title, TMDB collection name,
 * keywords) — then only *that* journey is resolved (from cache) to confirm
 * it's available and actually contains the movie. Never builds the whole
 * catalog, so movie pages stay fast on a cold cache.
 */
export async function findJourneyForMovie(movie: {
  id?: number;
  title: string;
  collectionId?: number | null;
  collectionName?: string | null;
  keywords?: string[];
}): Promise<{ id: string; name: string; shortName: string } | null> {
  const definition = findFranchiseDefinitionForMovie(movie);
  if (!definition) return null;

  const data = await getJourneyData(definition);
  if (data.status !== "available") return null;
  if (movie.id !== undefined && definition.source.kind !== "curated" && !data.members.some((member) => member.id === movie.id)) {
    return null;
  }
  return { id: definition.id, name: definition.name, shortName: definition.shortName };
}

const ORDER_LABELS: Record<JourneyOrderType, string> = {
  release: "Release order",
  chronological: "Chronological order",
  essential: "Essential order",
};

const MAX_SEARCH_MATCHES = 3;

/**
 * Journeys matching a search query — franchises first, at most three.
 * Matching is pure (names/aliases/curated titles); only the few matched
 * journeys are resolved to confirm availability and get their size.
 */
export async function searchJourneys(query: string): Promise<JourneySearchResult[]> {
  const matched = JOURNEY_DEFINITIONS.filter((definition) => matchesJourneyQuery(definition, query))
    .sort((a, b) => Number(b.type === "franchise") - Number(a.type === "franchise"))
    .slice(0, MAX_SEARCH_MATCHES);

  const settled = await Promise.allSettled(matched.map(getJourneyData));
  return matched.flatMap((definition, index) => {
    const result = settled[index];
    if (result.status !== "fulfilled" || result.value.status !== "available") return [];
    return [
      {
        id: definition.id,
        name: definition.name,
        movieCount: result.value.members.length,
        orderLabel: ORDER_LABELS[availableOrdersFor(definition)[0]],
      },
    ];
  });
}
