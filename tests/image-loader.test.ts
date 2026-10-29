import { test } from "node:test";
import assert from "node:assert/strict";
import imageLoader, { TMDB_WIDTHS } from "@/lib/image-loader";

const POSTER = "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg";

test("TMDB images get the smallest TMDB size that covers the requested width", () => {
  assert.equal(imageLoader({ src: POSTER, width: 64 }), "https://image.tmdb.org/t/p/w92/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg");
  assert.equal(imageLoader({ src: POSTER, width: 342 }), "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg");
  assert.equal(imageLoader({ src: POSTER, width: 384 }), "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg");
  assert.equal(imageLoader({ src: POSTER, width: 1080 }), "https://image.tmdb.org/t/p/w1280/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg");
  // Capped at w1280 rather than multi-megabyte originals.
  assert.equal(imageLoader({ src: POSTER, width: 3840 }), "https://image.tmdb.org/t/p/w1280/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg");
  // Any incoming size segment is replaced, including "original" and height-based ones.
  assert.equal(imageLoader({ src: "https://image.tmdb.org/t/p/original/a.jpg", width: 200 }), "https://image.tmdb.org/t/p/w342/a.jpg");
  assert.equal(imageLoader({ src: "https://image.tmdb.org/t/p/h632/a.jpg", width: 150 }), "https://image.tmdb.org/t/p/w154/a.jpg");
});

test("every width next/image can request maps to a real TMDB size", () => {
  // Next's default deviceSizes + imageSizes.
  for (const width of [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]) {
    const size = Number(imageLoader({ src: POSTER, width }).match(/\/w(\d+)\//)?.[1]);
    assert.ok((TMDB_WIDTHS as readonly number[]).includes(size), `${width} -> w${size}`);
  }
});

test("YouTube thumbnails use YouTube's own sizes", () => {
  const thumb = "https://img.youtube.com/vi/zSWdZVtXT7E/hqdefault.jpg";
  assert.equal(imageLoader({ src: thumb, width: 256 }), "https://img.youtube.com/vi/zSWdZVtXT7E/mqdefault.jpg");
  assert.equal(imageLoader({ src: thumb, width: 828 }), "https://img.youtube.com/vi/zSWdZVtXT7E/hqdefault.jpg");
});

test("nothing is routed through /_next/image", () => {
  assert.equal(imageLoader({ src: "/tmdb-logo.svg", width: 256 }), "/tmdb-logo.svg?w=256");
  assert.equal(imageLoader({ src: "https://example.com/x.jpg", width: 256 }), "https://example.com/x.jpg");
  assert.ok(!imageLoader({ src: POSTER, width: 256 }).includes("/_next/image"));
});
