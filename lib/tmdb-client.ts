import "server-only";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Thrown for any non-2xx TMDB response so callers can distinguish
 * "TMDB said no" from a network failure or a bug in our own code.
 */
export class TmdbApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public path: string
  ) {
    super(message);
    this.name = "TmdbApiError";
  }
}

interface TmdbFetchOptions {
  /** Extra query params, e.g. { query: "batman", page: "2" } */
  params?: Record<string, string>;
  /** Seconds to cache this response for (Next.js fetch cache). Default 3600 (1hr). */
  revalidateSeconds?: number;
}

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True for transient network failures (dropped connection, DNS blip,
 * timeout) worth retrying — as opposed to TMDB responding with a real
 * HTTP error, which `tmdbFetch` throws as `TmdbApiError` and callers
 * should not retry.
 */
function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Node's fetch wraps the underlying cause (e.g. `ECONNRESET`) here.
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  const code = cause?.code;
  return (
    error.name === "TypeError" &&
    (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "EAI_AGAIN" ||
      error.message.includes("fetch failed"))
  );
}

/**
 * Single low-level fetch wrapper. Every TMDB call in the app goes through
 * this function — auth headers, error handling, retrying, and caching are
 * defined once here instead of being copy-pasted at every call site.
 *
 * Movie detail pages fan out into a dozen-plus concurrent TMDB requests
 * (similar movies + full profiles for each candidate), which makes a
 * single dropped connection much more likely to be hit on any given page
 * load — hence the retry instead of just letting it bubble up as a 500.
 */
export async function tmdbFetch<T>(
  path: string,
  { params, revalidateSeconds = 3600 }: TmdbFetchOptions = {}
): Promise<T> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "TMDB_API_READ_ACCESS_TOKEN is not set. Add it to .env.local."
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
        next: { revalidate: revalidateSeconds },
      });

      if (!response.ok) {
        throw new TmdbApiError(
          `TMDB request failed: ${response.statusText}`,
          response.status,
          path
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      // Real TMDB HTTP errors (404, 401, ...) shouldn't be retried — only network-level failures.
      if (!isTransientNetworkError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  // Unreachable — the loop always either returns or throws — but keeps TypeScript happy.
  throw lastError;
}
