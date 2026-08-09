import type { TmdbVideo } from "@/types/tmdb";

/**
 * Shared, non-"use client" home for this logic so it can be called from
 * both the server (movie detail page, deciding whether to render the
 * "Trailer" heading at all) and the client TrailerEmbed component —
 * exporting it from a "use client" file would make it uncallable from a
 * Server Component.
 */
export function pickBestTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  const youtubeTrailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
  return youtubeTrailers.find((v) => v.official) ?? youtubeTrailers[0] ?? null;
}

export function hasTrailer(videos: TmdbVideo[]): boolean {
  return pickBestTrailer(videos) !== null;
}
