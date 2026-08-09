import Image from "next/image";
import { getOttDeepLink } from "@/lib/ott-providers";
import type { TmdbWatchProviderRegion, TmdbWatchProvider } from "@/types/tmdb";

interface WatchProvidersProps {
  /** The India (`IN`) region entry from TMDB's watch/providers response,
   *  or undefined if TMDB has no data for that country/movie at all. */
  region: TmdbWatchProviderRegion | undefined;
  /** Movie title, used to build each platform's direct search link. */
  movieTitle: string;
}

const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

/** Used by the page to decide whether to render the "Where to Watch"
 *  heading at all — TMDB sometimes returns a region entry with just a
 *  `link` and no actual flatrate/rent/buy/free/ads arrays. */
export function hasWatchProviders(region: TmdbWatchProviderRegion | undefined): boolean {
  if (!region) return false;
  return [region.flatrate, region.free, region.ads, region.rent, region.buy].some(
    (list) => (list?.length ?? 0) > 0
  );
}

function dedupeProviders(region: TmdbWatchProviderRegion): TmdbWatchProvider[] {
  // A provider can show up in more than one list (e.g. both flatrate and
  // buy) — we only want one badge per provider, since every badge links
  // to the same TMDB watch page regardless of which tier it came from.
  const byId = new Map<number, TmdbWatchProvider>();
  for (const list of [region.flatrate, region.free, region.ads, region.rent, region.buy]) {
    for (const provider of list ?? []) {
      if (!byId.has(provider.provider_id)) byId.set(provider.provider_id, provider);
    }
  }
  return [...byId.values()].sort((a, b) => a.display_priority - b.display_priority);
}

/**
 * "Where to Watch" — streaming/rent/buy availability in India, powered by
 * TMDB's JustWatch partnership. Each badge links directly to that
 * platform's own search results for the movie (best effort — TMDB's API
 * doesn't expose a real per-title deep link), falling back to TMDB's
 * watch page for the handful of providers not in lib/ott-providers.ts.
 * Per TMDB's terms this data must be attributed to JustWatch wherever
 * it's shown. Renders nothing if TMDB has no India availability.
 */
export function WatchProviders({ region, movieTitle }: WatchProvidersProps) {
  if (!region) return null;

  const providers = dedupeProviders(region);
  if (providers.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {providers.map((provider) => (
          <a
            key={provider.provider_id}
            href={getOttDeepLink(provider.provider_name, movieTitle) ?? region.link}
            target="_blank"
            rel="noopener noreferrer"
            title={`Watch on ${provider.provider_name}`}
            className="block rounded-lg overflow-hidden bg-white/90 hover:opacity-80 transition-opacity shrink-0"
          >
            {provider.logo_path ? (
              <Image
                src={`${IMAGE_BASE_URL}/w92${provider.logo_path}`}
                alt={provider.provider_name}
                width={44}
                height={44}
                className="size-11 object-cover"
              />
            ) : (
              <span className="flex items-center justify-center size-11 text-[10px] text-center text-black/70 px-1">
                {provider.provider_name}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Required by TMDB's terms: watch-provider data must be attributed
         to JustWatch (and TMDB) everywhere it's displayed, not just once
         somewhere in the app. */}
      <p className="text-xs text-muted">
        Streaming data provided by{" "}
        <a
          href="https://www.justwatch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-text"
        >
          JustWatch
        </a>
        , via{" "}
        <a
          href={region.link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-text"
        >
          TMDB
        </a>
        .
      </p>
    </div>
  );
}
