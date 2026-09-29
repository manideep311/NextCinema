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
  /** Seconds the Next.js Data Cache may reuse this response. 0 = never cache. */
  revalidateSeconds: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const MAX_RETRY_AFTER_MS = 3_000;
const REQUEST_TIMEOUT_MS = 10_000;
/** Outbound TMDB requests in flight per server instance — keeps fan-outs (journeys, similar movies) from bursting past TMDB's rate limits. */
const MAX_CONCURRENT_REQUESTS = 12;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Concurrency limiter ---------------------------------------------------

let activeRequests = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  // The releasing request hands its slot straight to us (see releaseSlot).
  await new Promise<void>((resolve) => waitQueue.push(resolve));
}

function releaseSlot() {
  const next = waitQueue.shift();
  if (next) next();
  else activeRequests--;
}

// --- In-flight de-duplication ------------------------------------------------

// Identical concurrent requests (e.g. two users opening the same journey,
// or the same movie profile needed by two recommendation pipelines at once)
// share one network call. Entries are removed as soon as the call settles,
// so this never becomes a second, unbounded cache — Next's Data Cache
// (`next.revalidate`) is the persistent layer.
const inFlight = new Map<string, Promise<unknown>>();

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;
  const code = (error as Error & { cause?: { code?: string } }).cause?.code;
  return (
    error.name === "TypeError" &&
    (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "EAI_AGAIN" ||
      code === "UND_ERR_SOCKET" || error.message.includes("fetch failed"))
  );
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Math.min(Number(retryAfter) * 1000, MAX_RETRY_AFTER_MS);
  }
  return RETRY_BASE_DELAY_MS * attempt;
}

async function performFetch<T>(url: string, path: string, revalidateSeconds: number, token: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    await acquireSlot();
    let response: Response | null = null;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(revalidateSeconds > 0 ? { next: { revalidate: revalidateSeconds } } : { cache: "no-store" as const }),
      });

      if (response.ok) return (await response.json()) as T;

      // Rate limited or a transient TMDB-side failure — worth another try.
      const retryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        throw new TmdbApiError(`TMDB request failed with status ${response.status}`, response.status, path);
      }
    } catch (error) {
      if (error instanceof TmdbApiError || !isRetryableNetworkError(error) || attempt >= MAX_ATTEMPTS) throw error;
    } finally {
      releaseSlot();
    }
    await sleep(retryDelayMs(response, attempt));
  }
}

/**
 * Single low-level fetch wrapper — every TMDB call goes through here, so
 * auth, caching, timeouts, retries, concurrency limiting, and de-duplication
 * are defined once. The bearer token is only ever sent in the Authorization
 * header; it never appears in URLs, errors, or logs.
 */
export function tmdbFetch<T>(path: string, { params, revalidateSeconds }: TmdbFetchOptions): Promise<T> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    return Promise.reject(new Error("TMDB_API_READ_ACCESS_TOKEN is not set. Add it to .env.local."));
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  if (params) {
    // Sorted so logically identical requests produce identical cache/dedupe keys.
    for (const key of Object.keys(params).sort()) url.searchParams.set(key, params[key]);
  }
  const urlString = url.toString();
  const dedupeKey = `${revalidateSeconds}|${urlString}`;

  const existing = inFlight.get(dedupeKey);
  if (existing) return existing as Promise<T>;

  const request = performFetch<T>(urlString, path, revalidateSeconds, token).finally(() => {
    inFlight.delete(dedupeKey);
  });
  inFlight.set(dedupeKey, request);
  return request;
}
