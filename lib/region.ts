// Watch-provider region — the single place the app decides which
// country's streaming availability to show.
//
// NextCinema is India-first (its OTT deep links in lib/ott-providers.ts
// cover the major Indian platforms), so India is the default. Deployments
// can change the default with WATCH_REGION, and when the hosting platform
// supplies a visitor-country header (Vercel, Cloudflare, CloudFront) that
// country is used instead — TMDB returns availability for most countries.

const COUNTRY_CODE = /^[A-Z]{2}$/;
const GEO_COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"] as const;

function normalizeCountry(value: string | null | undefined): string | null {
  const upper = value?.trim().toUpperCase() ?? "";
  // "XX"/"T1" are Cloudflare's unknown/Tor markers — not real countries.
  return COUNTRY_CODE.test(upper) && upper !== "XX" ? upper : null;
}

export const DEFAULT_WATCH_REGION: string = normalizeCountry(process.env.WATCH_REGION) ?? "IN";

/** Visitor's country from trusted platform geo headers, else the configured default. */
export function resolveWatchRegion(headers: { get(name: string): string | null }): string {
  for (const header of GEO_COUNTRY_HEADERS) {
    const country = normalizeCountry(headers.get(header));
    if (country) return country;
  }
  return DEFAULT_WATCH_REGION;
}
