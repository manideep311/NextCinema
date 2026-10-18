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

const KEY_PREFIX = "nextcinema";
/** Prefix from before the CineMatch → NextCinema rename; values under it are migrated on read. */
const LEGACY_KEY_PREFIX = "cinematch";

/**
 * Key for data that belongs to one signed-in user. Scoping by user id
 * means a second person signing in on the same browser never sees the
 * first person's data.
 */
export function userScopedKey(name: string, userId: string): string {
  return `${KEY_PREFIX}:${name}:${userId}`;
}

function legacyUserScopedKey(name: string, userId: string): string {
  return `${LEGACY_KEY_PREFIX}:${name}:${userId}`;
}

/**
 * Reads a user-scoped value. If only the pre-rename key exists, its raw
 * value is moved to the new key first, so nothing a user saved before the
 * rename is lost.
 */
export function readUserScoped<T>(name: string, userId: string): T | null {
  if (typeof window === "undefined") return null;
  const key = userScopedKey(name, userId);
  try {
    if (window.localStorage.getItem(key) === null) {
      const legacyKey = legacyUserScopedKey(name, userId);
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        window.localStorage.setItem(key, legacyValue);
        window.localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // Storage disabled — fall through to the plain read, which returns null.
  }
  return readFromStorage<T>(key);
}

const USER_SCOPED_NAMES = ["recent-searches"] as const;

/** Removes a user's scoped entries (called on sign-out), plus any pre-rename and pre-scoping keys. */
export function clearUserScopedStorage(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    for (const name of USER_SCOPED_NAMES) {
      window.localStorage.removeItem(userScopedKey(name, userId));
      window.localStorage.removeItem(legacyUserScopedKey(name, userId));
    }
    window.localStorage.removeItem(`${LEGACY_KEY_PREFIX}:recent-searches`);
  } catch {
    // Storage disabled — nothing to clear.
  }
}
