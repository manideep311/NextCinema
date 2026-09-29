// Lightweight fixed-window rate limiter — in-memory, per server instance.
//
// Deliberately infrastructure-free: it stops trivial abuse (credential
// stuffing from one IP, a script hammering /api/search, accidental request
// storms from a buggy client) without adding Redis or another service.
// Limits are best-effort: each serverless instance keeps its own counters,
// so a distributed attacker spread across instances gets proportionally
// more headroom. That trade-off is documented rather than hidden.

export interface RateLimitPolicy {
  /** Maximum requests allowed per window. */
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets (for the Retry-After header). */
  retryAfterSeconds: number;
}

const MINUTE = 60_000;

/** Every limited operation in the app, in one place. */
export const RATE_LIMITS = {
  "auth:login": { limit: 20, windowMs: 10 * MINUTE },
  /** Keyed by IP + email, so one account can't be brute-forced from one IP. */
  "auth:login-account": { limit: 6, windowMs: 10 * MINUTE },
  "auth:signup": { limit: 6, windowMs: 60 * MINUTE },
  search: { limit: 60, windowMs: MINUTE },
  recommendations: { limit: 30, windowMs: MINUTE },
  "tmdb-proxy": { limit: 120, windowMs: MINUTE },
  "library-write": { limit: 120, windowMs: MINUTE },
  "library-read": { limit: 120, windowMs: MINUTE },
  assistant: { limit: 30, windowMs: MINUTE },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMITS;

interface WindowState {
  count: number;
  resetAt: number;
}

/** Hard cap on tracked keys so a flood of unique keys can't exhaust memory. */
const MAX_TRACKED_KEYS = 20_000;

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, WindowState>();

  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const now = this.now();
    let state = this.windows.get(key);

    if (!state || state.resetAt <= now) {
      if (!state && this.windows.size >= MAX_TRACKED_KEYS) this.evict(now);
      state = { count: 0, resetAt: now + policy.windowMs };
      this.windows.set(key, state);
    }

    state.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));

    return {
      allowed: state.count <= policy.limit,
      remaining: Math.max(0, policy.limit - state.count),
      retryAfterSeconds,
    };
  }

  /** Number of keys currently tracked — exposed for tests. */
  get size(): number {
    return this.windows.size;
  }

  private evict(now: number) {
    for (const [key, state] of this.windows) {
      if (state.resetAt <= now) this.windows.delete(key);
    }
    // Still full of live windows (e.g. a key flood) — drop the oldest half.
    // Map iteration order is insertion order, so this removes the oldest.
    if (this.windows.size >= MAX_TRACKED_KEYS) {
      let toDrop = Math.floor(this.windows.size / 2);
      for (const key of this.windows.keys()) {
        if (toDrop-- <= 0) break;
        this.windows.delete(key);
      }
    }
  }
}

/** Process-wide limiter shared by every route handler in this instance. */
export const rateLimiter = new FixedWindowRateLimiter();

export function checkRateLimit(policyName: RateLimitPolicyName, identity: string): RateLimitResult {
  return rateLimiter.check(`${policyName}:${identity}`, RATE_LIMITS[policyName]);
}
