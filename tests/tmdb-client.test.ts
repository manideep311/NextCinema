import { test } from "node:test";
import assert from "node:assert/strict";
import { isRetryableStatus, tmdbFetch, TmdbApiError } from "@/lib/tmdb-client";

process.env.TMDB_API_READ_ACCESS_TOKEN = "test-token";

test("429 and every 5xx are retryable; 4xx are not", () => {
  for (const status of [429, 500, 502, 503, 504, 599]) assert.equal(isRetryableStatus(status), true, String(status));
  for (const status of [400, 401, 403, 404, 422]) assert.equal(isRetryableStatus(status), false, String(status));
});

function mockFetch(statuses: number[]) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    return new Response(JSON.stringify({ ok: status === 200 }), { status });
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("a plain 500 from TMDB is retried and the next success is returned", async () => {
  const mock = mockFetch([500, 200]);
  try {
    const result = await tmdbFetch<{ ok: boolean }>("/movie/1-retry-500", { revalidateSeconds: 0 });
    assert.deepEqual(result, { ok: true });
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("a 404 fails immediately without retrying", async () => {
  const mock = mockFetch([404]);
  try {
    await assert.rejects(tmdbFetch("/movie/2-not-found", { revalidateSeconds: 0 }), (error: unknown) => {
      assert.ok(error instanceof TmdbApiError);
      assert.equal(error.status, 404);
      return true;
    });
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});
