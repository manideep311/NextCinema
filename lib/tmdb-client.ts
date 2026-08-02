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

/**
 * Single low-level fetch wrapper. Every TMDB call in the app goes through
 * this function — auth headers, error handling, and caching are defined
 * once here instead of being copy-pasted at every call site.
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

  return response.json() as Promise<T>;
}