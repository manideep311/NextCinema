/**
 * Safe read from Local Storage. Returns null during SSR (no window),
 * on missing keys, or on any parse failure — callers always get a
 * clean null rather than a thrown exception to handle.
 */
export function readFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Safe write to Local Storage. Fails silently on quota errors or
 * disabled storage (e.g. private browsing) — the app should degrade
 * gracefully rather than crash over a non-critical persistence failure.
 */
export function writeToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Intentionally silent — see comment above.
  }
}

/**
 * Key for data that belongs to one signed-in user. Scoping by user id
 * means a second person signing in on the same browser never sees the
 * first person's data.
 */
export function userScopedKey(name: string, userId: string): string {
  return `cinematch:${name}:${userId}`;
}

const USER_SCOPED_NAMES = ["recent-searches"] as const;

/** Removes a user's scoped entries (called on sign-out), plus the pre-scoping global key. */
export function clearUserScopedStorage(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    for (const name of USER_SCOPED_NAMES) window.localStorage.removeItem(userScopedKey(name, userId));
    window.localStorage.removeItem("cinematch:recent-searches");
  } catch {
    // Storage disabled — nothing to clear.
  }
}
