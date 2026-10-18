/**
 * TMDB's image CDN base (sizes like `/w342` are appended per use). The
 * env var is optional — every poster, backdrop and logo falls back to the
 * public CDN, so a missing variable no longer renders "undefined/w342/…"
 * URLs. If you point it at another host, add that host to
 * `images.remotePatterns` in next.config.ts as well.
 */
export const TMDB_IMAGE_BASE_URL = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
