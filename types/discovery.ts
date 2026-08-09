/**
 * Plain types/constants shared between the server-only discovery service
 * (services/discovery.ts, which pulls in "server-only" via services/tmdb.ts
 * → lib/tmdb-client.ts) and the client components that render its output.
 * Deliberately has no imports of its own so client components can pull
 * these in without dragging the server-only chain into the browser bundle.
 */
export interface DiscoveryMovie {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseYear: string | null;
}

/**
 * `null` means that collection's underlying TMDB request(s) failed — the
 * caller should render a compact retry/hidden state for it, without that
 * failure taking down any other collection. `[]` means the request
 * succeeded but genuinely found nothing for this industry.
 */
export interface IndustryCollections {
  trending: DiscoveryMovie[] | null;
  topRated: DiscoveryMovie[] | null;
  hiddenGems: DiscoveryMovie[] | null;
  underTheRadar: DiscoveryMovie[] | null;
  newReleases: DiscoveryMovie[] | null;
}

// A rail with only one or two posters reads as broken, not curated — below
// this, the caller should hide the section entirely rather than show it.
export const MIN_COLLECTION_SIZE_TO_SHOW = 4;
