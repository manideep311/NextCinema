"use client";

// next/image loader (next.config.ts `images.loaderFile`). Instead of sending
// every poster through an image-optimization proxy, each request goes
// straight to a CDN that already serves pre-sized images:
//
//  - TMDB (image.tmdb.org/t/p/<size>/<file>) serves fixed widths for free,
//    so the size segment is swapped for the smallest one that covers the
//    width next/image asks for.
//  - YouTube thumbnails come in fixed sizes too (mqdefault 320, hqdefault 480).
//  - Anything else (local /public files) is returned as is.
//
// This also means the app never hosts an image proxy at /_next/image.

/** TMDB widths that work for posters, backdrops and profile photos alike. */
export const TMDB_WIDTHS = [92, 154, 185, 342, 500, 780, 1280] as const;

const TMDB_IMAGE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w\d+|h\d+|original)(\/[^/?#]+)$/;
const YOUTUBE_THUMB = /^(https:\/\/img\.youtube\.com\/vi\/[^/]+\/)[a-z]+default\.jpg$/;

interface LoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width }: LoaderParams): string {
  const tmdb = src.match(TMDB_IMAGE);
  if (tmdb) {
    // Capped at w1280: "original" can be several MB, and 1280 covers any layout here.
    const size = TMDB_WIDTHS.find((w) => w >= width) ?? TMDB_WIDTHS[TMDB_WIDTHS.length - 1];
    return `${tmdb[1]}w${size}${tmdb[2]}`;
  }

  const youtube = src.match(YOUTUBE_THUMB);
  if (youtube) return `${youtube[1]}${width <= 320 ? "mqdefault" : "hqdefault"}.jpg`;

  // Local files: the width only distinguishes srcset entries (the file is served as is).
  return src.startsWith("/") ? `${src}?w=${width}` : src;
}
