/**
 * Maps TMDB's `provider_name` strings to a direct link on that platform —
 * used so "Where to Watch" badges land on the actual streaming service
 * instead of TMDB's aggregator page. TMDB's API doesn't expose real deep
 * links to a specific title, so these are each platform's own search
 * page for the movie's title — the closest thing to a direct redirect
 * that's actually possible without scraping. Matching is substring-based
 * on the provider name (case-insensitive) since TMDB's exact provider
 * names/IDs shift over time (e.g. the 2025 JioCinema + Disney+ Hotstar
 * merger into JioHotstar), and a loose name match survives that better
 * than hardcoded numeric provider IDs would.
 */
interface OttPlatform {
  match: string;
  buildUrl: (title: string) => string;
}

const OTT_PLATFORMS: OttPlatform[] = [
  { match: "netflix", buildUrl: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
  { match: "prime video", buildUrl: (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}` },
  { match: "jiohotstar", buildUrl: (t) => `https://www.jiohotstar.com/search?q=${encodeURIComponent(t)}` },
  { match: "hotstar", buildUrl: (t) => `https://www.jiohotstar.com/search?q=${encodeURIComponent(t)}` },
  { match: "jiocinema", buildUrl: (t) => `https://www.jiohotstar.com/search?q=${encodeURIComponent(t)}` },
  { match: "sonyliv", buildUrl: (t) => `https://www.sonyliv.com/search?q=${encodeURIComponent(t)}` },
  { match: "zee5", buildUrl: (t) => `https://www.zee5.com/search?q=${encodeURIComponent(t)}` },
  { match: "apple tv", buildUrl: (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}` },
  { match: "itunes", buildUrl: (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}` },
  { match: "youtube", buildUrl: (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t + " full movie")}` },
  { match: "google play", buildUrl: (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies` },
  { match: "mx player", buildUrl: (t) => `https://www.mxplayer.in/search?q=${encodeURIComponent(t)}` },
  { match: "lionsgate", buildUrl: (t) => `https://www.lionsgateplay.com/search?q=${encodeURIComponent(t)}` },
  { match: "sun nxt", buildUrl: (t) => `https://www.sunnxt.com/search/${encodeURIComponent(t)}` },
];

/**
 * Returns a direct link to the given platform's search results for
 * `title`, or `null` if the provider isn't one of the platforms above —
 * callers should fall back to TMDB's own watch link in that case.
 */
export function getOttDeepLink(providerName: string, title: string): string | null {
  const lower = providerName.toLowerCase();
  const platform = OTT_PLATFORMS.find((p) => lower.includes(p.match));
  return platform ? platform.buildUrl(title) : null;
}
