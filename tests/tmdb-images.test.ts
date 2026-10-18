import { test } from "node:test";
import assert from "node:assert/strict";

test("image base URL falls back to TMDB's public CDN when the env var is unset", async () => {
  delete process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
  const { TMDB_IMAGE_BASE_URL } = await import("@/lib/tmdb-images");
  assert.equal(TMDB_IMAGE_BASE_URL, "https://image.tmdb.org/t/p");
});
