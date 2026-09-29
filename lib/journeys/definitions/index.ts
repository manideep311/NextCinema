import type { FranchiseKind, JourneyDefinition, JourneyOrderType, JourneyType } from "@/types/journey";
import { FRANCHISE_JOURNEYS } from "./franchises";
import { GENRE_JOURNEYS } from "./genres";
import { THEME_JOURNEYS } from "./themes";
import { MOOD_JOURNEYS } from "./moods";
import { DISCOVERY_JOURNEYS } from "./discovery";

/**
 * The whole journey catalog, as data. Adding a journey means adding an
 * entry to one of these files — no page, route, component, or engine code
 * changes. Order here is the order cards appear in (within the same
 * progress group).
 */
export const JOURNEY_DEFINITIONS: readonly JourneyDefinition[] = [
  ...FRANCHISE_JOURNEYS,
  ...DISCOVERY_JOURNEYS,
  ...GENRE_JOURNEYS,
  ...MOOD_JOURNEYS,
  ...THEME_JOURNEYS,
];

const BY_ID = new Map(JOURNEY_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getJourneyDefinition(id: string): JourneyDefinition | undefined {
  return BY_ID.get(id);
}

export const JOURNEY_TYPE_LABELS: Record<JourneyType, string> = {
  franchise: "Franchise Journey",
  genre: "Genre Journey",
  theme: "Theme Journey",
  mood: "Mood Journey",
  discovery: "Discovery Journey",
};

/** Card eyebrow for franchise journeys — says which kind of franchise it is. */
export const FRANCHISE_KIND_LABELS: Record<FranchiseKind, string> = {
  universe: "Cinematic Universe",
  "indian-universe": "Indian Cinematic Universe",
  action: "Action Franchise",
  superhero: "Superhero Franchise",
  "scifi-fantasy": "Sci-Fi & Fantasy Franchise",
  animated: "Animated Franchise",
  family: "Family Franchise",
  comedy: "Comedy Franchise",
  horror: "Horror Franchise",
  "crime-thriller": "Crime & Thriller Franchise",
  "drama-romance": "Drama & Romance Franchise",
  indian: "Indian Franchise",
  world: "World Cinema Franchise",
};

/** The label a journey card shows: the franchise kind when there is one, else the journey type. */
export function journeyLabel(definition: JourneyDefinition): string {
  return definition.franchiseKind ? FRANCHISE_KIND_LABELS[definition.franchiseKind] : JOURNEY_TYPE_LABELS[definition.type];
}

/** Which watch orders a journey genuinely supports — alternate orders exist only for curated franchises that document them. */
export function availableOrdersFor(definition: JourneyDefinition): JourneyOrderType[] {
  return definition.source.kind === "curated" ? definition.source.orders : ["release"];
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Normalizes a TMDB collection name or a definition's collection query to a comparable key. */
export function collectionKey(name: string): string {
  return normalizeText(name).replace(/\bcollection$/, "").replace(/^the /, "").trim();
}

/**
 * The franchise definition a movie belongs to, decided purely from data
 * the caller already has (no TMDB call). A movie can sit in several
 * journeys (Endgame is in the MCU and The Avengers; the Harry Potter films
 * are in Harry Potter and the Wizarding World), so the most specific wins:
 *   1. the TMDB collection (series) the movie itself belongs to,
 *   2. the smallest curated list that names it,
 *   3. a franchise keyword TMDB tagged it with (e.g. the DCEU).
 */
export function findFranchiseDefinitionForMovie(movie: {
  title: string;
  collectionId?: number | null;
  collectionName?: string | null;
  keywords?: string[];
}): JourneyDefinition | undefined {
  const franchises = JOURNEY_DEFINITIONS.filter((definition) => definition.type === "franchise");

  if (movie.collectionId || movie.collectionName) {
    const collection = movie.collectionName ? collectionKey(movie.collectionName) : null;
    const bySeries = franchises.find(
      (definition) =>
        definition.source.kind === "collection" &&
        definition.source.collections.some(
          (entry) => entry.id === movie.collectionId || (collection !== null && collectionKey(entry.name) === collection)
        )
    );
    if (bySeries) return bySeries;
  }

  const title = normalizeText(movie.title);
  const byTitle = franchises
    .filter((definition) => definition.source.kind === "curated" && definition.source.movies.some((entry) => normalizeText(entry.title) === title))
    .sort((a, b) => curatedSize(a) - curatedSize(b))[0];
  if (byTitle) return byTitle;

  const keywords = new Set((movie.keywords ?? []).map(normalizeText));
  return franchises.find(
    (definition) => definition.source.kind === "keyword" && definition.source.keywords.some((keyword) => keywords.has(normalizeText(keyword)))
  );
}

function curatedSize(definition: JourneyDefinition): number {
  return definition.source.kind === "curated" ? definition.source.movies.length : Infinity;
}

/** Free-text match on names, short names, and aliases (and curated titles). */
export function matchesJourneyQuery(definition: JourneyDefinition, query: string): boolean {
  const q = normalizeText(query);
  if (q.length < 2) return false;
  if (normalizeText(definition.name).includes(q) || normalizeText(definition.shortName).includes(q)) return true;
  if (
    (definition.aliases ?? []).some((alias) => {
      const a = normalizeText(alias);
      // Short aliases ("dc", "mcu") must match as whole words, not inside unrelated queries.
      return a === q || (a.length >= 4 && (a.includes(q) || new RegExp(`\\b${a}\\b`).test(q)));
    })
  ) {
    return true;
  }
  return (
    definition.source.kind === "curated" &&
    q.length >= 4 &&
    definition.source.movies.some((movie) => normalizeText(movie.title).includes(q))
  );
}

/**
 * Stable fingerprint of a definition (FNV-1a over its JSON). Part of every
 * journey cache key, so editing a definition invalidates only that
 * journey's cached resolution — no manual version bumps.
 */
export function definitionHash(definition: JourneyDefinition): string {
  const text = JSON.stringify(definition);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
